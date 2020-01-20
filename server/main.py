import re
import sqlite3
from contextlib import closing
from typing import Dict, List, Union

import responder
from requests_html import HTML, HTMLSession
from responder.models import Request, Response

api = responder.API(cors=True, cors_params={'allow_origins': ['http://localhost:3001']})
session = HTMLSession()
DB_PATH = 'database.db'
DB_UPDATE_FLG = True


def get_docs_list_impl() -> List[Dict[str, Union[str, int]]]:
    # 話の一覧を取得する
    docs_list: List[Dict[str, Union[str, int]]] = []
    for year in range(2017, 2030):
        page = session.get(f'https://dc.watch.impress.co.jp/docs/comic/clinic/index{year}.html')
        if not page.ok:
            break
        html: HTML = page.html
        temp_list: List[Dict[str, Union[str, int]]] = []
        for row in html.find('li.item.comic.clinic'):
            title = row.find('p.title > a', first=True).text
            doc_url: str = row.find('p.title > a', first=True).attrs['href']
            doc_id = re.sub(r'.*?(\d+)\.html', r'\1', doc_url)
            temp_list.append({
                'title': title,
                'doc_id': int(doc_id)
            })
        temp_list.reverse()
        for record in temp_list:
            docs_list.append(record)

    return docs_list


def get_doc_data_impl(doc_id: str) -> Dict[str, Union[str, int]]:
    # ある話についての情報を取得する
    page = session.get(f'https://dc.watch.impress.co.jp/docs/comic/clinic/{doc_id}.html')
    if not page.ok:
        page = session.get(f'http://dc.watch.impress.co.jp/docs/comic/clinic/{doc_id}.html')
        if not page.ok:
            return {
                'datetime': '',
                'images': 0,
                'message': ''
            }
    html: HTML = page.html
    page_datetime = html.find('p.publish-date', first=True)
    if page_datetime is None:
        return {
            'datetime': '',
            'images': 0,
            'message': ''
        }
    else:
        page_datetime = page_datetime.text
    page_images = 0
    for i in range(1, 100):
        image_url = f'https://dc.watch.impress.co.jp/img/dcw/docs/{doc_id[0:4]}/{doc_id[4:7]}/{str(i).zfill(2)}.png'
        image = session.get(image_url)
        if image.ok:
            page_images += 1
        else:
            break
    page_p_list = [x.text for x in html.find('p')]
    p_index = [i for i, x in enumerate(page_p_list) if '※本コンテンツはフィクションであり' in x]
    if len(p_index) > 0:
        page_message = ''
        for i in range(p_index[0] - 1, 0, -1):
            if page_p_list[i] == '':
                break
            if page_message == '':
                page_message = page_p_list[i]
            else:
                page_message = page_p_list[i] + '\n\n' + page_message
    else:
        page_message = ''
    return {
        'datetime': page_datetime,
        'images': page_images,
        'message': page_message
    }


def get_doc_image_impl(doc_id: str, image_index: str) -> bytes:
    image_url = f'https://dc.watch.impress.co.jp/img/dcw/docs/{doc_id[0:4]}/{doc_id[4:7]}/{image_index.zfill(2)}.png'
    image = session.get(image_url)
    if image.ok:
        return image.content
    else:
        return b''


@api.route("/api/docs")
def get_docs_list(req: Request, resp: Response):
    print('/api/docs')

    # noinspection PyDunderSlots,PyUnresolvedReferences
    resp.media = get_docs_list_impl()


@api.route('/api/docs/{doc_id}')
def get_doc_data(req: Request, resp: Response, doc_id: str):
    print(f'/api/docs/{doc_id}')
    # ある話についての情報を取得する
    with closing(sqlite3.connect(DB_PATH)) as conn:
        c = conn.cursor()
        if DB_UPDATE_FLG:
            c.execute('CREATE TABLE IF NOT EXISTS docs (id TEXT, datetime TEXT, images INTEGER, message TEXT)')
        result = c.execute(f'SELECT datetime, images, message FROM docs WHERE id="{doc_id}"').fetchall()
        if len(result) > 0:
            data = {
                'datetime': result[0][0],
                'images': result[0][1],
                'message': result[0][2]
            }
        else:
            data = get_doc_data_impl(doc_id)
            if DB_UPDATE_FLG:
                c.execute('INSERT INTO docs (id, datetime, images, message) VALUES (?, ?, ?, ?)',
                          (doc_id, data['datetime'], data['images'], data['message']))
        conn.commit()
    resp.media = data


@api.route('/api/docs/{doc_id}/images/{image_index}')
def get_doc_image(req: Request, resp: Response, doc_id: str, image_index: str):
    print(f'/api/docs/{doc_id}/images/{image_index}')
    # ある画像についての情報を返す
    with closing(sqlite3.connect(DB_PATH)) as conn:
        c = conn.cursor()
        if DB_UPDATE_FLG:
            c.execute('CREATE TABLE IF NOT EXISTS images (id TEXT, image_index TEXT, data BLOB)')
        result = c.execute(f'SELECT data FROM images WHERE id="{doc_id}" AND image_index="{image_index}"').fetchall()
        if len(result) > 0:
            data = result[0][0]
        else:
            data = get_doc_image_impl(doc_id, image_index)
            if DB_UPDATE_FLG:
                c.execute('INSERT INTO images (id, image_index, data) VALUES (?, ?, ?)',
                          (doc_id, image_index, data))
        conn.commit()
    resp.content = data


if __name__ == '__main__':
    api.run()
