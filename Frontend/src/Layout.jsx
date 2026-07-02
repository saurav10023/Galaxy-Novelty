import React from "react";

import { Outlet ,useNavigate} from "react-router-dom";
import ScrollToTop from "./ScrollToTop";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useEffect } from "react";
function Layout(){

    const navigate = useNavigate();

  useEffect(() => {
        const handler = () => navigate("/login");
        window.addEventListener("auth:session-expired", handler);
        return () => window.removeEventListener("auth:session-expired", handler);
    }, [navigate]);
    return (
        <>
        <ScrollToTop/>
        <Navbar/>
        <Outlet/>
        <Footer/>
        </>

    )
};

export default Layout ;