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
    <div className="min-h-screen bg-white">
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
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .swagger-ui,
          .swagger-ui .info .title,
          .swagger-ui .info .description,
          .swagger-ui .opblock-tag,
          .swagger-ui table thead tr th,
          .swagger-ui table tbody tr td,
          .swagger-ui .tab li,
          .swagger-ui .opblock .opblock-summary-description,
          .swagger-ui .opblock-description-wrapper p {
            color: #e5e5e5;
          }
          .swagger-ui .opblock {
            background: #1a1a1a;
            border-color: #333;
          }
          .swagger-ui .opblock .opblock-summary {
            border-color: #333;
          }
          .swagger-ui .opblock-body pre.microlight {
            background: #2d2d2d;
          }
          .swagger-ui section.models {
            border-color: #333;
          }
          .swagger-ui section.models.is-open h4 {
            border-color: #333;
          }
        }
      `}</style>
      <div className="container mx-auto px-4 py-8">
        <SwaggerUI url="/api/api-docs" />
      </div>
    </div>
  )
}
