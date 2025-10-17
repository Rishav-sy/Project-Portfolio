import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "../mode-toggle";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">📊</span>
          <span className="brand-text">Stocker</span>
        </Link>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/">
                <NavigationMenuLink className={`nav-link ${isActive("/") ? "active" : ""}`}>
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link to="/stocks">
                <NavigationMenuLink className={`nav-link ${isActive("/stocks") ? "active" : ""}`}>
                  Stocks
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link to="/real-estate">
                <NavigationMenuLink className={`nav-link ${isActive("/real-estate") ? "active" : ""}`}>
                  Real Estate
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="navbar-actions">
          <ModeToggle />
          {user && (
            <>
              <span className="user-name">{user.full_name || user.email}</span>
              <Button onClick={logout} variant="destructive" size="sm">
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
