import os
import json
import sqlite3
import asyncio
import logging
from datetime import datetime
import motor.motor_asyncio
from pymongo.errors import ConnectionFailure
from app.config import settings

logger = logging.getLogger("soc_database")

# Helper to serialize datetimes to ISO strings for JSON
def json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

# Helper to deserialize ISO strings back to datetimes
def json_deserial(dct):
    for key, value in dct.items():
        if isinstance(value, str):
            try:
                # Attempt to parse ISO format datetimes
                if len(value) >= 19 and (value[10] == 'T' or value[10] == ' '):
                    dct[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                pass
    return dct

class SQLiteCollection:
    def __init__(self, name: str, db_path: str):
        self.name = name
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(f"CREATE TABLE IF NOT EXISTS {self.name} (id TEXT PRIMARY KEY, data TEXT)")
        conn.commit()
        conn.close()

    def _get_connection(self):
        return sqlite3.connect(self.db_path)

    async def insert_one(self, document: dict):
        doc = document.copy()
        if "id" not in doc and "_id" not in doc:
            import uuid
            doc["id"] = str(uuid.uuid4())
        elif "_id" in doc and "id" not in doc:
            doc["id"] = str(doc["_id"])
            
        doc_id = doc.get("id") or doc.get("_id")
        doc["_id"] = doc_id
        
        # Serialize datetime fields
        serialized_data = json.dumps(doc, default=json_serial)
        
        loop = asyncio.get_event_loop()
        def _execute():
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                f"INSERT OR REPLACE INTO {self.name} (id, data) VALUES (?, ?)",
                (str(doc_id), serialized_data)
            )
            conn.commit()
            conn.close()
            return doc
            
        return await loop.run_in_executor(None, _execute)

    async def find_one(self, filter_dict: dict):
        loop = asyncio.get_event_loop()
        def _execute():
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(f"SELECT data FROM {self.name}")
            rows = cursor.fetchall()
            conn.close()
            
            for row in rows:
                doc = json.loads(row[0], object_hook=json_deserial)
                match = True
                for k, v in filter_dict.items():
                    # Handle _id / id equivalence
                    key_to_check = k if k != "_id" else "id"
                    if doc.get(key_to_check) != v:
                        match = False
                        break
                if match:
                    return doc
            return None
            
        return await loop.run_in_executor(None, _execute)

    async def find(self, filter_dict: dict = None, sort: list = None, limit: int = 0, skip: int = 0):
        if filter_dict is None:
            filter_dict = {}
            
        loop = asyncio.get_event_loop()
        def _execute():
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(f"SELECT data FROM {self.name}")
            rows = cursor.fetchall()
            conn.close()
            
            results = []
            for row in rows:
                doc = json.loads(row[0], object_hook=json_deserial)
                match = True
                for k, v in filter_dict.items():
                    # Simple support for operators like $regex or list checks
                    if isinstance(v, dict):
                        # Regex match
                        if "$regex" in v:
                            import re
                            pattern = re.compile(v["$regex"], re.IGNORECASE)
                            val = doc.get(k)
                            if not val or not pattern.search(str(val)):
                                match = False
                                break
                        elif "$gt" in v:
                            if doc.get(k) <= v["$gt"]:
                                match = False
                                break
                        elif "$lt" in v:
                            if doc.get(k) >= v["$lt"]:
                                match = False
                                break
                    else:
                        key_to_check = k if k != "_id" else "id"
                        if doc.get(key_to_check) != v:
                            match = False
                            break
                if match:
                    results.append(doc)
            
            # Sorting
            if sort:
                for field, direction in reversed(sort):
                    results.sort(
                        key=lambda x: (x.get(field) is None, x.get(field)),
                        reverse=(direction == -1 or direction == "DESC")
                    )
            
            # Skip and Limit
            if skip > 0:
                results = results[skip:]
            if limit > 0:
                results = results[:limit]
                
            return results

        return await loop.run_in_executor(None, _execute)

    async def update_one(self, filter_dict: dict, update_dict: dict):
        loop = asyncio.get_event_loop()
        def _execute():
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(f"SELECT id, data FROM {self.name}")
            rows = cursor.fetchall()
            
            updated_doc = None
            for row_id, data_str in rows:
                doc = json.loads(data_str, object_hook=json_deserial)
                match = True
                for k, v in filter_dict.items():
                    key_to_check = k if k != "_id" else "id"
                    if doc.get(key_to_check) != v:
                        match = False
                        break
                if match:
                    # Update fields
                    if "$set" in update_dict:
                        for uk, uv in update_dict["$set"].items():
                            doc[uk] = uv
                    else:
                        for uk, uv in update_dict.items():
                            doc[uk] = uv
                            
                    doc["updated_at"] = datetime.utcnow()
                    serialized_data = json.dumps(doc, default=json_serial)
                    cursor.execute(
                        f"UPDATE {self.name} SET data = ? WHERE id = ?",
                        (serialized_data, row_id)
                    )
                    conn.commit()
                    updated_doc = doc
                    break
            conn.close()
            return updated_doc

        return await loop.run_in_executor(None, _execute)

    async def delete_one(self, filter_dict: dict):
        loop = asyncio.get_event_loop()
        def _execute():
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(f"SELECT id, data FROM {self.name}")
            rows = cursor.fetchall()
            
            deleted = False
            for row_id, data_str in rows:
                doc = json.loads(data_str, object_hook=json_deserial)
                match = True
                for k, v in filter_dict.items():
                    key_to_check = k if k != "_id" else "id"
                    if doc.get(key_to_check) != v:
                        match = False
                        break
                if match:
                    cursor.execute(f"DELETE FROM {self.name} WHERE id = ?", (row_id,))
                    conn.commit()
                    deleted = True
                    break
            conn.close()
            return deleted

        return await loop.run_in_executor(None, _execute)

    async def count_documents(self, filter_dict: dict = None):
        if filter_dict is None:
            filter_dict = {}
        docs = await self.find(filter_dict)
        return len(docs)


class MongoDBCollectionWrapper:
    def __init__(self, collection):
        self._collection = collection

    def __getattr__(self, name):
        return getattr(self._collection, name)

    async def insert_one(self, document: dict):
        doc = document.copy()
        if "id" not in doc and "_id" not in doc:
            import uuid
            doc["id"] = str(uuid.uuid4())
            doc["_id"] = doc["id"]
        elif "_id" in doc and "id" not in doc:
            doc["id"] = str(doc["_id"])
        elif "id" in doc and "_id" not in doc:
            doc["_id"] = str(doc["id"])
            
        await self._collection.insert_one(doc)
        return doc

    async def find_one(self, filter_dict: dict):
        doc = await self._collection.find_one(filter_dict)
        return doc

    async def find(self, filter_dict: dict = None, sort: list = None, limit: int = 0, skip: int = 0):
        if filter_dict is None:
            filter_dict = {}
        
        cursor = self._collection.find(filter_dict)
        
        if sort:
            cursor = cursor.sort(sort)
            
        if skip > 0:
            cursor = cursor.skip(skip)
            
        if limit > 0:
            cursor = cursor.limit(limit)
            
        return await cursor.to_list(length=limit if limit > 0 else 100000)

    async def update_one(self, filter_dict: dict, update_dict: dict):
        await self._collection.update_one(filter_dict, update_dict)
        return await self._collection.find_one(filter_dict)

    async def delete_one(self, filter_dict: dict):
        res = await self._collection.delete_one(filter_dict)
        return res.deleted_count > 0

    async def count_documents(self, filter_dict: dict = None):
        if filter_dict is None:
            filter_dict = {}
        return await self._collection.count_documents(filter_dict)


class DualModeDatabase:
    def __init__(self):
        self.is_mongodb = False
        self.mongo_client = None
        self.db = None
        
        # SQLite Collections cache
        self.sqlite_collections = {}
        self.db_path = settings.DB_FALLBACK_SQLITE_PATH

    def get_collection(self, name: str):
        if self.is_mongodb:
            return MongoDBCollectionWrapper(self.db[name])
        else:
            if name not in self.sqlite_collections:
                self.sqlite_collections[name] = SQLiteCollection(name, self.db_path)
            return self.sqlite_collections[name]

    # Property mappings to match standard collections
    @property
    def users(self): return self.get_collection("users")
    @property
    def logs(self): return self.get_collection("logs")
    @property
    def alerts(self): return self.get_collection("alerts")
    @property
    def incidents(self): return self.get_collection("incidents")
    @property
    def threat_intel(self): return self.get_collection("threat_intel")
    @property
    def audit_logs(self): return self.get_collection("audit_logs")
    @property
    def settings(self): return self.get_collection("settings")
    @property
    def playbooks(self): return self.get_collection("playbooks")

    async def connect(self):
        logger.info("Connecting to database...")
        logger.info(f"Attempting MongoDB connection to: {settings.MONGODB_URL[:40]}...")
        try:
            # Allow up to 8 seconds for Atlas / cloud MongoDB connections
            self.mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=8000,
                connectTimeoutMS=8000,
                socketTimeoutMS=10000,
            )
            # Try to ping the database
            await self.mongo_client.admin.command('ping')
            self.db = self.mongo_client[settings.DATABASE_NAME]
            self.is_mongodb = True
            logger.info(f"Successfully connected to MongoDB Atlas! Database: {settings.DATABASE_NAME}")
        except Exception as e:
            self.is_mongodb = False
            logger.error(
                f"Failed to connect to MongoDB (error: {type(e).__name__}: {e}). Falling back to SQLite backend at: {self.db_path}"
            )
            # SQLite tables will be initialized on-demand

db = DualModeDatabase()
