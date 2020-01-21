from flask import Flask, render_template, send_from_directory, jsonify, make_response
from flask_cors import CORS

from database import Database
from library import get_docs_list_impl, get_doc_data_impl, get_doc_image_impl

DB_PATH = 'database.db'
DB_UPDATE_FLG = True

app = Flask(__name__)
CORS(app)
db = Database(DB_PATH, DB_UPDATE_FLG)


@app.route("/")
def main_page():
    return render_template("index.html")


@app.route("/api/docs")
def get_docs_list():
    return jsonify(get_docs_list_impl())


@app.route('/api/docs/<doc_id>')
def get_doc_data(doc_id: str):
    print(f'/api/docs/{doc_id}')

    data = db.select_doc(doc_id)
    if data['datetime'] != '':
        return jsonify(data)
    data = get_doc_data_impl(doc_id)
    db.insert_doc(doc_id, data['datetime'], data['images'], data['message'])
    return jsonify(data)


@app.route('/api/docs/<doc_id>/images/<image_index>')
def get_doc_image(doc_id: str, image_index: str):
    print(f'/api/docs/{doc_id}/images/{image_index}')

    data = db.select_image(doc_id, image_index)
    if len(data) > 0:
        response = make_response(data)
        response.headers.set('Content-Type', 'image/png')
        return response

    data = get_doc_image_impl(doc_id, image_index)
    db.insert_image(doc_id, image_index, data)

    response = make_response(data)
    response.headers.set('Content-Type', 'image/png')
    return response


@app.route("/<static_file>")
def manifest(static_file: str):
    return send_from_directory('./root', static_file)


if __name__ == '__main__':
    print(app.url_map)
    app.run(port=8080)
