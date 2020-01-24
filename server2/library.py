import re
from typing import List, Dict, Union

from requests_html import HTML, HTMLSession


session = HTMLSession()


def get_docs_list_impl() -> List[Dict[str, Union[str, int]]]:
    # 話の一覧を取得する
    docs_list: List[Dict[str, Union[str, int]]] = []
    for year in range(2017, 2030):
        page = session.get(f'https://dc.watch.impress.co.jp/docs/comic/clinic/index{year}.html')
        if not page.ok:
            break
        html: HTML = page.html
        temp_list: List[Dict[str, Union[str, int]]] = []
        for row in html.find('div#main li.item.comic.clinic'):
            title = row.find('p.title > a', first=True).text
            doc_url: str = row.find('p.title > a', first=True).attrs['href']
            doc_id = re.sub(r'.*?(\d+)\.html', r'\1', doc_url)

            # 特殊な回を弾く
            if '1191350' in doc_id:
                continue

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
    image_tags = html.find('div.img-wrap-w > img.resource')
    page_images = len(image_tags)
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

    # 一部ページ対策
    image_url2 = f'https://dc.watch.impress.co.jp/img/dcw/docs/{doc_id[0:4]}/{doc_id[4:7]}/{image_index.zfill(2).replace("0", "a")}.png'
    image = session.get(image_url2)
    if image.ok:
        return image.content

    image_url3 = f'https://dc.watch.impress.co.jp/img/dcw/docs/{doc_id[0:4]}/{doc_id[4:7]}/a{image_index.zfill(2)}.png'
    image = session.get(image_url3)
    if image.ok:
        return image.content

    image_url4 = f'https://dc.watch.impress.co.jp/img/dcw/docs/{doc_id[0:4]}/{doc_id[4:7]}/y{image_index.zfill(2)}.png'
    image = session.get(image_url4)
    if image.ok:
        return image.content

    image_url5 = f'https://dc.watch.impress.co.jp/img/dcw/docs/{doc_id[0:4]}/{doc_id[4:7]}/x{image_index.zfill(2)}.png'
    image = session.get(image_url5)
    if image.ok:
        return image.content

    image_url6 = f'https://dc.watch.impress.co.jp/img/dcw/docs/{doc_id[0:4]}/{doc_id[4:7]}/z{image_index.zfill(2)}.png'
    image = session.get(image_url6)
    if image.ok:
        return image.content
    return b''