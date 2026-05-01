import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DisplayPage } from './display/DisplayPage.js';
import { PlayPage } from './play/PlayPage.js';
import { Landing } from './Landing.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/display" element={<DisplayPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
