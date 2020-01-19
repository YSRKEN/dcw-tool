import React, { useState, useEffect } from 'react';
import 'App.css';

const SERVER_PATH = window.location.port === '3000'
  ? 'http://127.0.0.1:5042'
  : window.location.protocol + '//' + window.location.host;

interface DocInfo {
  title: string;
  id: number;
  datetime: string;
  images: number;
  message: string;
}

const App: React.FC = () => {
  const [docList, setDocList] = useState<DocInfo[]>([]);

  useEffect(() => {
    const initialize = async () => {
      const docs: {title: string, doc_id: number}[] = await (await fetch(SERVER_PATH + '/api/docs')).json();
      const result: DocInfo[] = [];
      for (const doc of docs) {
        const docInfo: {datetime: string, images: number, message: string} = await (await fetch(SERVER_PATH + '/api/docs/' + doc.doc_id)).json();
        result.push({
          title: doc.title,
          id: doc.doc_id,
          datetime: docInfo.datetime,
          images: docInfo.images,
          message: docInfo.message
        });
      }
      setDocList(result);
    };
    initialize();
  }, []);

  return (
    <div className="container">
      <div className="row">
        <div className="col my-3">
          <h1 className="text-center">カメラバカ</h1>
        </div>
      </div>
      <div className="row">
        <div className="col my-3">
          <table className="table table-sm table-bordered">
            <thead className="table-light">
              <tr>
                <th scope="col">日時</th>
                <th scope="col">画</th>
                <th scope="col">題名</th>
              </tr>
            </thead>
            <tbody>
              {
                docList.map(record => {
                  return (
                    <tr key={record.id}>
                      <td>{record.datetime}</td>
                      <td>{record.images}</td>
                      <td>{record.title}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
