import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import { Building2 } from "lucide-react"
import { ModeToggle } from "../mode-toggle"
import { useAuth } from '../../context/AuthContext'

export function Navbar() {
  const { user, displayName, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    // Clear localStorage to ensure clean logout
    localStorage.clear()
    navigate('/')
    // Reload to reset guest state
    window.location.reload()
  }

  return (
    <header className="px-4 py-10 lg:px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-8"> 
        <Link to="/" className="flex items-center justify-center">
          <Building2 className="h-6 w-6" />
          <span className="sr-only">Stocker</span>
          <span className="ml-5 font-bold text-lg">Stocker</span>
        </Link>
        <nav>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/">Home</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/stocks">Stocks</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/realestate">Real Estate</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <ModeToggle />
        {user ? (
          <>
            <span className="text-sm font-medium">{displayName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">Guest</span>
            <Link to="/login">
              <Button className="px-8" variant="default">Login</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

export default Navbar
