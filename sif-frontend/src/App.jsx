import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AnalysisResult from './pages/AnalysisResult';
import Dashboard from './pages/Dashboard';
import ReportExplorer from './pages/ReportExplorer';
import ReviewQueue from './pages/ReviewQueue';
import SubmitReport from './pages/SubmitReport';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="submit" element={<SubmitReport />} />
        <Route path="analysis/:id?" element={<AnalysisResult />} />
        <Route path="review" element={<ReviewQueue />} />
        <Route path="reports" element={<ReportExplorer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
