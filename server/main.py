import re
from typing import Dict, List

import responder
from requests_html import HTML, HTMLSession
from responder.models import Request, Response

api = responder.API()
session = HTMLSession()


@api.route("/api/docs")
def get_docs_list(req: Request, resp: Response):
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
                'doc_id': doc_id
            })
        temp_list.reverse()
        for record in temp_list:
            docs_list.append(record)

    # noinspection PyDunderSlots,PyUnresolvedReferences
    resp.media = docs_list


@api.route('/api/docs/x')
def get_doc_data(req: Request, resp: Response):
    pass


if __name__ == '__main__':
    api.run()
