# Components Directory

This directory contains shared UI components used across the application.

<!-- AUTO-MANAGED: module-description -->

## Purpose

Reusable UI components shared across features. Contains base UI primitives, layout components, admin widgets, and advertising components.

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->

## Module Architecture

```
components/
├── admin/              # Admin dashboard components
│   ├── user-management/  # User CRUD components
│   │   ├── ban-user-dialog.tsx
│   │   ├── suspend-user-dialog.tsx
│   │   ├── moderation-actions-card.tsx
│   │   ├── moderation-history-card.tsx
│   │   ├── pro-subscription-card.tsx
│   │   ├── user-info-card.tsx
│   │   └── user-list.tsx
│   ├── admin-sidebar.tsx # Admin navigation
│   ├── date-range-picker.tsx
│   ├── funnel-chart.tsx
│   ├── user-growth-chart.tsx
│   └── ...
├── ads/                # AdSense components
│   ├── ad-scripts.tsx  # AdSense script loader
│   ├── ad-unit.tsx     # Generic ad container
│   ├── consent-banner.tsx
│   ├── feed-ad-banner.tsx
│   ├── in-feed-ad.tsx
│   └── sidebar-ad.tsx
├── common/             # Shared utility components
│   ├── location-autocomplete.tsx
│   ├── markdown-renderer.tsx
│   ├── subscription-badge.tsx
│   ├── verification-badge.tsx
│   └── ...
├── layout/             # Layout components
│   └── ...
├── providers/          # Context providers
│   ├── csrf-provider.tsx
│   └── toast-provider.tsx
└── ui/                 # Base UI primitives
    ├── accordion.tsx
    ├── avatar.tsx
    ├── badge.tsx         # Status badges with variants (success, warning, danger, pro)
    ├── confirm-dialog.tsx
    ├── error-boundary.tsx
    ├── form-error.tsx
    ├── loading-spinner.tsx # Spinner components (LoadingSpinner, PageLoadingSpinner, InlineSpinner)
    ├── polling-status.tsx
    ├── pull-to-refresh.tsx
    ├── skip-link.tsx
    ├── textarea.tsx
    └── toast.tsx
```

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->

## Module-Specific Conventions

### Component Organization

- **ui/**: Base primitives (buttons, inputs, modals)
- **common/**: Business-logic components shared across features
- **admin/**: Admin-specific components
- **ads/**: Advertising integration
- **providers/**: React context providers
- **layout/**: Page layout components

### Component Patterns

- Use `'use client'` for interactive components
- Export named components (not default)
- Props interface defined above component
- Use `clsx` or `tailwind-merge` for class composition
- Wrap event handlers in `useCallback` when passed to `useEffect` dependencies

### Naming

- Files: kebab-case (`confirm-dialog.tsx`)
- Components: PascalCase (`ConfirmDialog`)
- Hooks within components: `use` prefix

### Styling

- Tailwind CSS classes directly in JSX
- Use `cn()` utility for conditional classes
- Mobile-first responsive design
- Gradient backgrounds for emphasis (badges, pro features)
- Motion-safe animations (prefer-reduced-motion support)

### Testing

**Component Tests**: Located in `__tests__/components/`

**UI Component Testing Pattern**:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('UI Component', () => {
  it('should render with correct variant styles', () => {
    const { container } = render(<Component variant="success">Text</Component>);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass('from-green-400');
  });

  it('should have accessibility attributes', () => {
    const { container } = render(<Component />);
    const element = container.querySelector('[role="status"]');
    expect(element).toHaveAttribute('aria-label', 'Loading');
  });

  it('should accept custom className', () => {
    const { container } = render(<Component className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });
});
```

**Test Coverage**:

- Badge: All variants (default, success, warning, danger, info, pro), styling, animations
- LoadingSpinner: Sizes (sm, md, lg, xl), accessibility, custom labels
- PageLoadingSpinner: Full-page layout
- InlineSpinner: Button/inline contexts

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: dependencies -->

## Key Dependencies

**UI Libraries:**

- `lucide-react` - Icons
- `clsx` + `tailwind-merge` - Class utilities
- `@dnd-kit/*` - Drag and drop
- `recharts` - Charts (admin)

**Form Handling:**

- `react-hook-form` - Form state
- `@hookform/resolvers` - Zod integration
- `zod` - Schema validation

**External:**

- `@googlemaps/js-api-loader` - Maps autocomplete

<!-- END AUTO-MANAGED -->

<!-- MANUAL -->

## Component Checklist

When creating new shared components:

1. Place in appropriate subdirectory
2. Add `'use client'` if interactive
3. Define Props interface
4. Include accessibility attributes
5. Support mobile responsiveness
6. Add to this list if commonly used

<!-- END MANUAL -->
