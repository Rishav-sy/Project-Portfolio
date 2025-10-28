import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/theme-provider'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar/Navbar'
import Home from './pages/Home/Home'
import Stocks from './pages/Stocks/Stocks'
import RealEstate from './pages/RealEstate/RealEstate'
import Login from './pages/Login/Login'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/stocks" element={<Stocks />} />
                  <Route path="/realestate" element={<RealEstate />} />
                </Routes>
              </>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
