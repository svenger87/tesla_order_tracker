'use client'

import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  ),
})

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <style jsx global>{`
        /* Swagger UI customizations */
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 30px 0;
        }
        .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: 700;
        }
        .swagger-ui .scheme-container {
          padding: 15px 0;
          background: transparent;
          box-shadow: none;
        }
        .swagger-ui .opblock-tag {
          font-size: 1.25rem;
        }
        .swagger-ui .opblock .opblock-summary-operation-id {
          font-size: 0.875rem;
        }
        /* Dark mode: keyed to the app theme class, not the OS setting.
           next-themes toggles the .dark class on the html element, so a
           prefers-color-scheme query here disagreed with the rest of the app
           whenever the OS setting and the in-app toggle differed. */
        .dark .swagger-ui,
        .dark .swagger-ui .info .title,
        .dark .swagger-ui .info .description,
        .dark .swagger-ui .opblock-tag,
        .dark .swagger-ui table thead tr th,
        .dark .swagger-ui table tbody tr td,
        .dark .swagger-ui .tab li,
        .dark .swagger-ui .opblock .opblock-summary-description,
        .dark .swagger-ui .opblock-description-wrapper p {
            color: #e5e5e5;
          }
        .dark .swagger-ui .opblock {
            background: #1a1a1a;
            border-color: #333;
          }
        .dark .swagger-ui .opblock .opblock-summary {
            border-color: #333;
          }
        .dark .swagger-ui .opblock-body pre.microlight {
            background: #2d2d2d;
          }
        .dark .swagger-ui section.models {
            border-color: #333;
          }
        .dark .swagger-ui section.models.is-open h4 {
            border-color: #333;
          }

      `}</style>
      <div className="container mx-auto px-4 py-8">
        <SwaggerUI url="/api/api-docs" />
      </div>
    </div>
  )
}
