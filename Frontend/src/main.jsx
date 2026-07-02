import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './Layout.jsx'
import Home from './Home/Home.jsx'
import Login from './pages/Login.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import AdminDashboard from './pages/Admin/AdminDashboard.jsx'
import ShopPage from './pages/Shoppage.jsx'
import ProductCard from './components/ProductCard.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Contact from './pages/Contact.jsx'




const router = createBrowserRouter([
    {
      path:"/",
      element:<Layout/>,
      children: [
        {index:true , element:<Home/>},
        {path:"/login" , element:<Login/>},
        {path:"/admin" , element:<AdminDashboard/>},
        {path:"/shop" , element:<ShopPage/>},
        {path:"/product/:id" , element:<ProductDetail/>},
        {path:"/contact",element:<Contact/>}
      ]
    }
  ])

createRoot(document.getElementById('root')).render(

  <StrictMode>
    <AuthProvider>
        <RouterProvider router ={router}/>     
    </AuthProvider>
  </StrictMode>,
)
