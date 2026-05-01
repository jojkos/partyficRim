import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DisplayPage } from './display/DisplayPage.js';
import { PlayPage } from './play/PlayPage.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<DisplayPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
