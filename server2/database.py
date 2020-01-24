import sqlite3
from contextlib import closing
from typing import Dict


class Database:
    def __init__(self, db_name: str, update_flg: bool):
        self.db_name = db_name
        self.update_flg = update_flg

        with closing(sqlite3.connect(self.db_name)) as conn:
            c = conn.cursor()
            if self.update_flg:
                c.execute('CREATE TABLE IF NOT EXISTS docs (id TEXT, datetime TEXT, images INTEGER, message TEXT)')
                c.execute('CREATE TABLE IF NOT EXISTS images (id TEXT, image_index TEXT, data BLOB)')
            conn.commit()

    def select_doc(self, doc_id: str) -> Dict[str, any]:
        with closing(sqlite3.connect(self.db_name)) as conn:
            c = conn.cursor()
            result = c.execute(f'SELECT datetime, images, message FROM docs WHERE id="{doc_id}"').fetchall()
            if len(result) > 0:
                return {
                    'datetime': result[0][0],
                    'images': result[0][1],
                    'message': result[0][2]
                }
            else:
                return {
                    'datetime': '',
                    'images': 0,
                    'message': ''
                }

    def insert_doc(self, doc_id: str, datetime: str, images: int, message: str):
        if self.update_flg:
            with closing(sqlite3.connect(self.db_name)) as conn:
                c = conn.cursor()
                c.execute('INSERT INTO docs (id, datetime, images, message) VALUES (?, ?, ?, ?)',
                          (doc_id, datetime, images, message))
                conn.commit()

    def select_image(self, doc_id: str, image_index: str) -> bytes:
        with closing(sqlite3.connect(self.db_name)) as conn:
            c = conn.cursor()
            result = c.execute(
                f'SELECT data FROM images WHERE id="{doc_id}" AND image_index="{image_index}"').fetchall()
            if len(result) > 0:
                return result[0][0]
            return b''

    def insert_image(self, doc_id: str, image_index: str, data: bytes):
        if self.update_flg:
            with closing(sqlite3.connect(self.db_name)) as conn:
                c = conn.cursor()
                c.execute('INSERT INTO images (id, image_index, data) VALUES (?, ?, ?)',
                          (doc_id, image_index, data))
                conn.commit()
