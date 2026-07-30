import { Routes, Route } from 'react-router';
import { CustomerProfilePage } from './pages/CustomerProfilePage';

export function App() {
  return (
    <Routes>
      <Route path="/shop/:id/profile" element={<CustomerProfilePage />} />
      <Route path="/profile" element={<CustomerProfilePage />} />
      <Route path="/shop/:id" element={<CustomerProfilePage />} />
      <Route path="/" element={<CustomerProfilePage />} />
    </Routes>
  );
}

export default App;
