import React, { useState, useEffect } from 'react';
import 'App.css';

const SERVER_PATH = window.location.port === '3000'
  ? 'http://127.0.0.1:5042'
  : window.location.protocol + '//' + window.location.host;

const App: React.FC = () => {
  const [docList, setDocList] = useState<{ title: string, doc_id: number }[]>([]);

  useEffect(() => {
    fetch(SERVER_PATH + '/api/docs')
      .then(res => res.json())
      .then(res => setDocList(res));
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
                <th scope="col">題名</th>
              </tr>
            </thead>
            <tbody>
              {
                docList.map(record => {
                  return (
                    <tr key={record.doc_id}>
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
