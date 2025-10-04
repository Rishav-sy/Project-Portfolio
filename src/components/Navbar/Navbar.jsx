import React, { useState } from "react";
import "./Navbar.css";
import arrow from "../../assets/arrow.png";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim() === "") {
      setResults([]);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/stocks/search?q=${value}`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="navbar">
      <ul>
        <li>
          <img src="/logo.svg" alt="logo" />
        </li>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/stocks">Stocks</Link>
        </li>
        <li>
          <Link to="/real-estate">Real Estate</Link>
        </li>
      </ul>
      <div className="navbar-right">
        <div className="search-container">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search stocks..."
            />
            <button type="submit">Search</button>
          </form>
          {results.length > 0 && (
            <ul className="search-dropdown">
              {results.map((stock) => (
                <li key={stock.id} className="search-result-item">
                  <span className="stock-name">{stock.stock_name}</span>
                  <span className="stock-ticker">({stock.ticker_symbol})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button>
          Sign Up <img src={arrow} alt="" />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
