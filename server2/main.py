from flask import Flask, render_template, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route("/")
def main_page():
    return render_template("index.html")


@app.route("/<static_file>")
def manifest(static_file: str):
    return send_from_directory('./root', static_file)


if __name__ == '__main__':
    app.run(port=8080)
