import React, { useEffect, useReducer, useState } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from "react-router-dom";

/*
  MovieClub - React single-file app
  - Uses axios for HTTP
  - useEffect for lifecycle
  - useReducer for state management
  - Components: Filters, SearchBox, TVList, TVCard, WatchlistPanel, Pagination, ShowDetail, Home, Footer
  - Conditional rendering for loading / error / empty
  - Pagination (6 per page)
  - Initial query: "friends"

  Author shown in Footer: Hediye Sert
*/

// -------------------------
// Reducer and initial state
// -------------------------
const initialState = {
  query: "friends",
  filters: {
    genre: "all",
    language: "all",
    minRating: 0,
  },
  loading: false,
  error: null,
  results: [], // array of shows (from search)
  page: 1,
  pageSize: 6,
  watchlist: [], // array of show objects
};

const ACTIONS = {
  FETCH_INIT: "FETCH_INIT",
  FETCH_SUCCESS: "FETCH_SUCCESS",
  FETCH_FAILURE: "FETCH_FAILURE",
  SET_QUERY: "SET_QUERY",
  SET_FILTERS: "SET_FILTERS",
  SET_WATCHLIST: "SET_WATCHLIST",
  SET_PAGE_SIZE: "SET_PAGE_SIZE",
  ADD_WATCHLIST: "ADD_WATCHLIST",
  REMOVE_WATCHLIST: "REMOVE_WATCHLIST",
  CLEAR_WATCHLIST: "CLEAR_WATCHLIST",
  SET_PAGE: "SET_PAGE",
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.FETCH_INIT:
      return { ...state, loading: true, error: null };
    case ACTIONS.FETCH_SUCCESS:
      return { ...state, loading: false, results: action.payload, error: null, page: 1 };
    case ACTIONS.FETCH_FAILURE:
      return { ...state, loading: false, error: action.payload };
    case ACTIONS.SET_QUERY:
      return { ...state, query: action.payload };
    case ACTIONS.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload }, page: 1 };
    case ACTIONS.SET_WATCHLIST:
      return { ...state, watchlist: action.payload };
    case ACTIONS.SET_PAGE_SIZE:
      return { ...state, pageSize: action.payload, page: 1 };
    case ACTIONS.ADD_WATCHLIST: {
      const already = state.watchlist.find((s) => s.id === action.payload.id);
      if (already) return state;
      const updated = [...state.watchlist, action.payload];
      localStorage.setItem("movieclub_watchlist", JSON.stringify(updated));
      return { ...state, watchlist: updated };
    }
    case ACTIONS.REMOVE_WATCHLIST: {
      const updated = state.watchlist.filter((s) => s.id !== action.payload);
      localStorage.setItem("movieclub_watchlist", JSON.stringify(updated));
      return { ...state, watchlist: updated };
    }
    case ACTIONS.CLEAR_WATCHLIST:
      localStorage.removeItem("movieclub_watchlist");
      return { ...state, watchlist: [] };
    case ACTIONS.SET_PAGE:
      return { ...state, page: action.payload };
    default:
      return state;
  }
}

// -------------------------
// Helper: fetch shows
// -------------------------
async function fetchShows(query) {
  const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
  const res = await axios.get(url);
  // API returns array of { score, show }
  return res.data.map((item) => item.show);
}

// -------------------------
// Components
// -------------------------

function Spinner() {
  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <div className="spinner" aria-label="loading">Loading...</div>
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div style={{ padding: 20, background: "#ffe6e6", border: "1px solid #ffb3b3", borderRadius: 6 }}>
      <p><strong>Hata:</strong> {message}</p>
      <button onClick={onRetry}>Tekrar dene</button>
    </div>
  );
}

function EmptyBox({ message }) {
  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <p>{message}</p>
    </div>
  );
}

function SearchBox({ query, onSearch, setQuery }) {
  const [local, setLocal] = useState(query);
  useEffect(() => setLocal(query), [query]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setQuery(local);
        onSearch(local);
      }}
      style={{ display: "flex", gap: 8 }}
    >
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Dizi ara..."
        aria-label="search"
      />
      <button type="submit">Ara</button>
    </form>
  );
}

function Filters({ filters, setFilters, availableGenres, availableLanguages }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <label>
        Tür:
        <select
          value={filters.genre}
          onChange={(e) => setFilters({ genre: e.target.value })}
        >
          <option value="all">Tümü</option>
          {availableGenres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </label>

      <label>
        Dil:
        <select
          value={filters.language}
          onChange={(e) => setFilters({ language: e.target.value })}
        >
          <option value="all">Tümü</option>
          {availableLanguages.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </label>

      <label>
        Min Puan:
        <input
          type="number"
          min={0}
          max={10}
          value={filters.minRating}
          onChange={(e) => setFilters({ minRating: Number(e.target.value || 0) })}
          style={{ width: 60 }}
        />
      </label>
    </div>
  );
}

function TVCard({ show, onAddWatchlist }) {
  const img = show.image ? show.image.medium : null;
  const genres = show.genres?.join(", ") || "-";
  const language = show.language || "-";
  const rating = show.rating?.average ?? "-";
  const summary = show.summary ? stripTags(show.summary).slice(0, 180) + (show.summary.length > 180 ? "..." : "") : "Özet yok";
  return (
    <div style={{ border: "1px solid #ddd", padding: 8, borderRadius: 6, display: "flex", gap: 8 }}>
      <div style={{ width: 120 }}>
        {img ? <img src={img} alt={show.name} style={{ width: "100%", borderRadius: 4 }} /> : <div style={{ height: 160, background: "#f0f0f0" }}>No Image</div>}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0 }}>{show.name}</h3>
        <div style={{ fontSize: 13, color: "#555" }}>{genres} • {language} • Puan: {rating}</div>
        <p style={{ marginTop: 8 }}>{summary}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/show/${show.id}`}><button>Detay</button></Link>
          <button 
            onClick={() => onAddWatchlist(show)}
            style={{
              backgroundColor: '#FF6B6B',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Gösterime Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

function stripTags(html = "") {
  return html.replace(/<[^>]*>/g, "");
}

function TVList({ shows, onAddWatchlist }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      {shows.map((s) => (
        <TVCard key={s.id} show={s} onAddWatchlist={onAddWatchlist} />
      ))}
    </div>
  );
}

function Pagination({ page, pageSize, totalItems, setPage }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={() => setPage(1)} disabled={page === 1}>İlk</button>
      <button onClick={() => setPage(page - 1)} disabled={page === 1}>Geri</button>
      <span>Sayfa {page} / {totalPages}</span>
      <button onClick={() => setPage(page + 1)} disabled={page === totalPages}>İleri</button>
      <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>Son</button>
    </div>
  );
}

function WatchlistPanel({ watchlist, onRemove, onClear }) {
  return (
    <aside style={{ width: 320, borderLeft: "1px solid #eee", paddingLeft: 12 }}>
      <h3>Gösterime Girecekler ({watchlist.length})</h3>
      {watchlist.length === 0 ? <p>Henüz bir şey yok.</p> : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {watchlist.map((w) => (
            <li key={w.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Link to={`/show/${w.id}`}><strong>{w.name}</strong></Link>
                <div>
                  <button onClick={() => onRemove(w.id)}>Kaldır</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 12 }}>
        <button onClick={onClear} disabled={watchlist.length === 0}>Temizle</button>
      </div>
    </aside>
  );
}

// -------------------------
// Pages
// -------------------------

function Home({ state, dispatch }) {
  const { query, filters, loading, error, results, page, pageSize } = state;

  // Set dark gray background
  useEffect(() => {
    document.body.style.backgroundColor = '#333333';
    document.body.style.color = 'white';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  // derive available genres and languages from results
  const allGenres = Array.from(new Set(results.flatMap((r) => r.genres || []))).sort();
  const allLanguages = Array.from(new Set(results.map((r) => r.language).filter(Boolean))).sort();

  // apply filters
  const filtered = results.filter((s) => {
    if (filters.genre !== "all" && !(s.genres || []).includes(filters.genre)) return false;
    if (filters.language !== "all" && s.language !== filters.language) return false;
    const score = s.rating?.average ?? 0;
    if (score < (filters.minRating || 0)) return false;
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return (
    <div style={{ display: "flex", gap: 20 }}>
      <main style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SearchBox
            query={query}
            onSearch={(q) => dispatch({ type: ACTIONS.FETCH_INIT })}
            setQuery={(q) => dispatch({ type: ACTIONS.SET_QUERY, payload: q })}
          />
          <div>
            <label>Sayfa başı: </label>
            <select value={pageSize} onChange={(e) => dispatch({ type: ACTIONS.SET_PAGE_SIZE, payload: Number(e.target.value) })}>
              <option value={6}>6</option>
              <option value={12}>12</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Filters
            filters={filters}
            setFilters={(f) => dispatch({ type: ACTIONS.SET_FILTERS, payload: f })}
            availableGenres={allGenres}
            availableLanguages={allLanguages}
          />
        </div>

        {loading && <Spinner />}
        {error && <ErrorBox message={error} onRetry={() => dispatch({ type: ACTIONS.FETCH_INIT })} />}
        {!loading && !error && total === 0 && <EmptyBox message="Sonuç bulunamadı." />}

        {!loading && !error && total > 0 && (
          <>
            <TVList shows={pageItems} onAddWatchlist={(s) => dispatch({ type: ACTIONS.ADD_WATCHLIST, payload: s })} />
            <div style={{ marginTop: 12 }}>
              <Pagination page={page} pageSize={pageSize} totalItems={total} setPage={(p) => dispatch({ type: ACTIONS.SET_PAGE, payload: Math.max(1, Math.min(Math.ceil(total / pageSize), p)) })} />
            </div>
          </>
        )}
      </main>

      <WatchlistPanel
        watchlist={state.watchlist}
        onRemove={(id) => dispatch({ type: ACTIONS.REMOVE_WATCHLIST, payload: id })}
        onClear={() => dispatch({ type: ACTIONS.CLEAR_WATCHLIST })}
      />
    </div>
  );
}

function ShowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [show, setShow] = useState(null);
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [showRes, epsRes] = await Promise.all([
          axios.get(`https://api.tvmaze.com/shows/${id}`),
          axios.get(`https://api.tvmaze.com/shows/${id}/episodes`),
        ]);
        if (!cancelled) {
          setShow(showRes.data);
          setEpisodes(epsRes.data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Hata oluştu");
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={() => window.location.reload()} />;
  if (!show) return <EmptyBox message="Dizi bulunamadı." />;

  return (
    <div>
      <button onClick={() => navigate(-1)}>Geri</button>
      <h2>{show.name}</h2>
      <div style={{ display: "flex", gap: 12 }}>
        {show.image ? <img src={show.image.medium} alt={show.name} /> : <div style={{ width: 210, height: 295, background: "#f0f0f0" }} />}
        <div>
          <p><strong>Türler:</strong> {(show.genres || []).join(", ")}</p>
          <p><strong>Dil:</strong> {show.language}</p>
          <p><strong>Puan:</strong> {show.rating?.average ?? "-"}</p>
          <div dangerouslySetInnerHTML={{ __html: show.summary || "" }} />
        </div>
      </div>

      <h3>Bölümler ({episodes.length})</h3>
      {episodes.length === 0 ? <p>Bölüm bulunamadı.</p> : (
        <ol>
          {episodes.map((ep) => (
            <li key={ep.id}>{ep.season}x{ep.number} — {ep.name}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 12 }}>
      <small>Prepared by Hediye Sert — Süleyman Demirel Üniversitesi Film Kulübü Demo</small>
    </footer>
  );
}

// -------------------------
// Top-level App
// -------------------------
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // load watchlist from localStorage once
  useEffect(() => {
    const raw = localStorage.getItem("movieclub_watchlist");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        dispatch({ type: ACTIONS.SET_WATCHLIST, payload: parsed });
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // fetch whenever query changes or FETCH_INIT dispatched
  useEffect(() => {
    let cancelled = false;
    async function load() {
      dispatch({ type: ACTIONS.FETCH_INIT });
      try {
        const shows = await fetchShows(state.query);
        if (cancelled) return;
        dispatch({ type: ACTIONS.FETCH_SUCCESS, payload: shows });
      } catch (e) {
        if (cancelled) return;
        dispatch({ type: ACTIONS.FETCH_FAILURE, payload: e.message || "Fetch error" });
      }
    }
    // initial load
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.query]);

  return (
    <Router>
      <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ textDecoration: 'none' }}><Link to="/" style={{ color: '#8B0000', textDecoration: 'none' }}>SDÜ Film Kulübü 🎬</Link></h1>
          <nav>
            <Link to="/">Anasayfa</Link>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<Home state={state} dispatch={dispatch} />} />
          <Route path="/show/:id" element={<ShowDetail />} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}
