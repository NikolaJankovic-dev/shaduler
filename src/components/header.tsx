import React from 'react'
import { ModeToggle } from './mode-toggle'

const Header = () => {
  return (
    <div className="flex justify-between items-center py-4 container mx-auto">
      <h1 className="text-2xl font-bold">Shaduler</h1>
      <ModeToggle />
    </div>
  )
}

export default Header