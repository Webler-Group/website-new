type PaginationControlProps = {
  page?: number;
  between?: number;
  total: number;
  limit: number;
  changePage?: (page: number) => void;
  next?: boolean;
  last?: boolean;
  ellipsis?: number;
};

export const PaginationControl: React.FC<PaginationControlProps> = ({ 
  page = 1, 
  between = 3, 
  total, 
  limit, 
  changePage = () => {}, 
  next = true, 
  last = true, 
  ellipsis = 1 
}) => {
  const totalPages = Math.ceil(total / limit);
  
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const half = Math.floor(between / 2);
    
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, page + half);
    
    if (page <= half) {
      end = Math.min(totalPages, between);
    } else if (page >= totalPages - half) {
      start = Math.max(1, totalPages - between + 1);
    }
    
    if (start > 1) {
      pages.push(1);
      if (start > 2 && ellipsis > 0) {
        pages.push('...');
      }
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (end < totalPages) {
      if (end < totalPages - 1 && ellipsis > 0) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  const handlePageChange = (newPage: number): void => {
    if (newPage >= 1 && newPage <= totalPages) {
      changePage(newPage);
    }
  };

  return (
    <nav aria-label="Page navigation">
      <ul className="wb-pagination-modern">
        {last && (
          <li className={`wb-page-item ${page === 1 ? 'wb-disabled' : ''}`}>
            <button
              className="wb-page-link wb-page-link-icon"
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
              aria-label="First page"
            >
              <svg className="wb-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </li>
        )}

        {next && (
          <li className={`wb-page-item ${page === 1 ? 'wb-disabled' : ''}`}>
            <button
              className="wb-page-link wb-page-link-icon"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <svg className="wb-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </li>
        )}

        {getPageNumbers().map((pageNum, idx) => (
          pageNum === '...' ? (
            <li key={`ellipsis-${idx}`} className="wb-page-item wb-disabled">
              <span className="wb-page-link wb-page-ellipsis">•••</span>
            </li>
          ) : (
            <li key={pageNum} className={`wb-page-item ${page === pageNum ? 'wb-active' : ''}`}>
              <button
                className="wb-page-link"
                onClick={() => handlePageChange(pageNum as number)}
              >
                {pageNum}
              </button>
            </li>
          )
        ))}

        {next && (
          <li className={`wb-page-item ${page === totalPages ? 'wb-disabled' : ''}`}>
            <button
              className="wb-page-link wb-page-link-icon"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <svg className="wb-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </li>
        )}

        {last && (
          <li className={`wb-page-item ${page === totalPages ? 'wb-disabled' : ''}`}>
            <button
              className="wb-page-link wb-page-link-icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
              aria-label="Last page"
            >
              <svg className="wb-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};
