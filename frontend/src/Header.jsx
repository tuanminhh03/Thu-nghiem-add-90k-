import React from 'react'
import './Header.css'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'

export default function Header() {
  return (
    <header className="site-header">
      {/* Phần 1: Top bar */}
      <div className="top-bar">
        <div className="top-bar__left">
           <span className="site-logo-text">DAILYWITHMINH</span>
        </div>
        <div className="top-bar__right">
          <button className="btn-link">Đăng nhập</button>
          <button className="btn-cart">
            <ShoppingCartIcon className="icon" />
          </button>
        </div>
      </div>

      {/* Phần 2: Nav bar */}
      <div className="nav-bar">
        <div className="nav-bar__left">
          {/* Netflix icon + chữ */}
          <a href="https://dailywithminh.com"><img src="/images/netflix-icon.png" alt="Netflix" className='nav-icon' /></a>
          {/* <img src="/images/netflix-icon.png" alt="Netflix" className="nav-icon" /> */}
          <span className="nav-label">Netflix</span>

          {/* Sau này bạn có thể copy block này để thêm Youtube, Spotify */}
          {/* <img src="/images/youtube-icon.png" alt="YouTube" className="nav-icon" />
          <span className="nav-label">YouTube</span> */}
        </div>
        <div className="nav-bar__right">
          {/* Nếu cần các nút nav bên phải, để trống tạm */}
        </div>
      </div>
    </header>
  )
}
