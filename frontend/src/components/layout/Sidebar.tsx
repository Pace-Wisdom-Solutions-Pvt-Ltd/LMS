// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { ElementType } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import logo from '@/assets/pws_logo_new_text.png'
import { useTenant } from '@/context/TenantContext'

export interface SidebarNavItem {
  to: string
  label: string
  icon: ElementType
  disabled?: boolean
  /** When set, `to` is used as-is instead of being prefixed with `basePath` — for links into another role's route tree (e.g. a manager who is also a student). */
  absolute?: boolean
}

/** A labeled, separator-divided group of nav items — e.g. role-specific modules shown together. */
export interface SidebarNavGroup {
  label: string
  items: SidebarNavItem[]
}

interface SidebarProps {
  basePath: string
  navItems: SidebarNavItem[]
  collapsed: boolean
  /** Additional labeled groups, each rendered with a separator + uppercase heading, between the main nav and the settings group. */
  groups?: SidebarNavGroup[]
  settingsItems?: SidebarNavItem[]
  settingsLabel?: string
  onToggle?: () => void
  /** Hide the brand logo — used when this sidebar sits beside another that already shows it. */
  hideLogo?: boolean
  /** Title shown in the top block in place of the logo (e.g. when hideLogo is set). */
  topLabel?: string
}

function NavItem({ item, basePath, collapsed }: Readonly<{ item: SidebarNavItem; basePath: string; collapsed: boolean }>) {
  const Icon = item.icon
  const sharedClass = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${collapsed ? 'justify-center' : ''}`

  if (item.disabled) {
    return (
      <span
        title={collapsed ? item.label : undefined}
        className={`${sharedClass} cursor-not-allowed opacity-40 select-none text-slate-500`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </span>
    )
  }

  return (
    <NavLink
      to={item.absolute ? item.to : `${basePath}${item.to}`}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `${sharedClass} transition-all duration-200 ${
          isActive
            ? 'bg-brand-teal/10 text-brand-teal ring-1 ring-brand-teal/20 shadow-sm'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

function NavGroup({ label, items, basePath, collapsed }: Readonly<{ label: string; items: SidebarNavItem[]; basePath: string; collapsed: boolean }>) {
  return (
    <div className="pt-3 mt-1 border-t border-slate-100">
      <p className={`px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider ${collapsed ? 'hidden' : ''}`}>
        {label}
      </p>
      {items.map((item) => (
        <NavItem key={item.to} item={item} basePath={basePath} collapsed={collapsed} />
      ))}
    </div>
  )
}

export default function Sidebar({ basePath, navItems, collapsed, groups, settingsItems, settingsLabel, onToggle, hideLogo, topLabel }: Readonly<SidebarProps>) {
  const { tenant } = useTenant()
  const logoSrc = tenant?.logo_url ?? (collapsed ? '/just-logo.png' : logo)

  return (
    <aside
      className={`relative md:z-30 shrink-0 bg-white/95 backdrop-blur-sm border-r border-slate-200/80 shadow-sm flex flex-col transition-all duration-300 ease-in-out max-md:fixed max-md:left-0 max-md:top-0 max-md:bottom-0 max-md:shadow-xl max-md:transition-transform ${
        collapsed ? 'w-[72px] max-md:-translate-x-full' : 'w-64 max-md:translate-x-0 max-md:z-50'
      }`}
    >
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex absolute -right-3 top-5 z-40 h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-all duration-200 hover:scale-110 hover:border-brand-teal/50 hover:text-brand-teal hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 focus-visible:ring-offset-1"
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            strokeWidth={2.5}
          />
        </button>
      )}
      {hideLogo ? (
        // Keep the same top height as a neighbouring sidebar; show a context title.
        <div className="px-4 border-b border-slate-100 flex items-center overflow-hidden h-16">
          {!collapsed && topLabel && (
            <p className="text-sm font-bold text-slate-800 truncate" title={topLabel}>{topLabel}</p>
          )}
        </div>
      ) : (
        <div className="p-4 border-b border-slate-100 flex justify-center items-center overflow-hidden h-16">
          <img
            src={logoSrc}
            alt={tenant?.name ?? 'LMS'}
            className={`object-contain transition-all duration-300 ${collapsed ? 'h-8 w-8' : 'h-10'}`}
          />
        </div>
      )}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.to} item={item} basePath={basePath} collapsed={collapsed} />
        ))}
        {groups?.map((group) => (
          <NavGroup key={group.label} label={group.label} items={group.items} basePath={basePath} collapsed={collapsed} />
        ))}
        {settingsItems && (
          <NavGroup label={settingsLabel ?? 'Settings'} items={settingsItems} basePath={basePath} collapsed={collapsed} />
        )}
      </nav>
    </aside>
  )
}
