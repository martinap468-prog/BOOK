import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Dashboard from "./pages/Dashboard";
import BookEditor from "./pages/BookEditor";
import PDFPreview from "./pages/PDFPreview";
import ChatAssistant from "./components/ChatAssistant";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/:bookId" element={<BookEditor />} />
          <Route path="/preview/:bookId" element={<PDFPreview />} />
        </Routes>
        <ChatAssistant />
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
