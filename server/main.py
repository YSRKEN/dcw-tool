import re
from typing import Dict, List, Union

import responder
from requests_html import HTML, HTMLSession
from responder.models import Request, Response

api = responder.API(cors=True, cors_params={'allow_origins': ['http://localhost:3000']})
session = HTMLSession()
DB_PATH = 'database.db'
DB_FLG = True


@api.route("/api/docs")
def get_docs_list(req: Request, resp: Response):
    print('/api/docs')
    # 話の一覧を取得する
    docs_list: List[Dict[str, str]] = []
    for year in range(2017, 2030):
        page = session.get(f'https://dc.watch.impress.co.jp/docs/comic/clinic/index{year}.html')
        if not page.ok:
            break
        html: HTML = page.html
        temp_list: List[Dict[str, str]] = []
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

    # noinspection PyDunderSlots,PyUnresolvedReferences
    resp.media = docs_list


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


@api.route('/api/docs/{doc_id}')
def get_doc_data(req: Request, resp: Response, doc_id: str):
    print(f'/api/docs/{doc_id}')
    # ある話についての情報を取得する
    data = get_doc_data_impl(doc_id)
    print(data)
    resp.media = data


@api.route('/api/docs/{doc_id}/images/{image_index}')
def get_doc_data(req: Request, resp: Response, doc_id: str, image_index: str):
    print(f'/api/docs/{doc_id}/images/{image_index}')
    image_url = f'https://dc.watch.impress.co.jp/img/dcw/docs/{doc_id[0:4]}/{doc_id[4:7]}/{image_index.zfill(2)}.png'
    image = session.get(image_url)
    if image.ok:
        resp.content = image.content


if __name__ == '__main__':
    api.run()
