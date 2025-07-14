import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api/form';

function App() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    age: '',
    study: '',
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError('Failed to fetch data');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          age: Number(form.age),
        }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setForm({ name: '', email: '', mobile: '', age: '', study: '' });
      fetchData();
    } catch (err) {
      setError('Failed to submit form');
    }
  };

  return (
    <div className="container">
      <h2>Student Form</h2>
      <form onSubmit={handleSubmit} className="form">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" required />
        <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="Mobile Number" required />
        <input name="age" value={form.age} onChange={handleChange} placeholder="Age" type="number" required />
        <input name="study" value={form.study} onChange={handleChange} placeholder="Study" required />
        <button type="submit">Submit</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <h3>Submitted Data</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Age</th>
              <th>Study</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item._id}>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>{item.mobile}</td>
                <td>{item.age}</td>
                <td>{item.study}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
