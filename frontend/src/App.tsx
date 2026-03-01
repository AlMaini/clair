import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import NotePage from './pages/NotePage'
import Search from './pages/Search'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/note/:id" element={<NotePage />} />
      <Route path="/search" element={<Search />} />
    </Routes>
  )
}

export default App
