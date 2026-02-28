import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import NotePage from './pages/NotePage'
import Search from './pages/Search'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/note/:id" element={<NotePage />} />
      <Route path="/search" element={<Search />} />
    </Routes>
  )
}

export default App
