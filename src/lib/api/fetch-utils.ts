/**
 * Safe fetch utility with standardized error handling.
 * Returns typed response with data, error message, and status code.
 */

export interface FetchResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * HTTP error messages in Vietnamese
 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Dữ liệu không hợp lệ',
  401: 'Phiên đăng nhập hết hạn',
  403: 'Không có quyền truy cập',
  404: 'Không tìm thấy dữ liệu',
  409: 'Dữ liệu bị xung đột',
  422: 'Dữ liệu không thể xử lý',
  429: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
  500: 'Lỗi máy chủ, vui lòng thử lại',
  502: 'Lỗi kết nối máy chủ',
  503: 'Dịch vụ tạm thời không khả dụng',
  504: 'Máy chủ không phản hồi',
};

/**
 * Get Vietnamese error message for HTTP status code
 */
function getErrorMessage(status: number, statusText?: string): string {
  if (HTTP_ERROR_MESSAGES[status]) {
    return HTTP_ERROR_MESSAGES[status];
  }
  if (status >= 500) {
    return 'Lỗi máy chủ, vui lòng thử lại';
  }
  if (status >= 400) {
    return statusText ? `Lỗi: ${statusText}` : 'Yêu cầu không hợp lệ';
  }
  return 'Đã xảy ra lỗi không xác định';
}

/**
 * Parse error from API response body
 * Attempts to extract error message from JSON response
 */
async function parseErrorFromResponse(res: Response): Promise<string> {
  try {
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const json = await res.json();
      // Handle various API error response formats
      if (json.error) return json.error;
      if (json.message) return json.message;
      if (json.errors && Array.isArray(json.errors)) {
        return json.errors.map((e: { message?: string }) => e.message || e).join(', ');
      }
    }
  } catch {
    // Ignore parse errors, use default message
  }
  return getErrorMessage(res.status, res.statusText);
}

/**
 * Wrapper around fetch with standardized error handling.
 * Returns { data, error, status } instead of throwing.
 *
 * @example
 * const { data, error, status } = await safeFetch<User[]>('/api/users');
 * if (error) {
 *   toast.error(error);
 *   return;
 * }
 * // Use data safely
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      const errorMessage = await parseErrorFromResponse(res);
      return { data: null, error: errorMessage, status: res.status };
    }

    // Handle empty responses (204 No Content)
    if (res.status === 204) {
      return { data: null, error: null, status: 204 };
    }

    const data = await res.json();

    // Handle API response format: { success: boolean, data: T, error?: string }
    if (typeof data === 'object' && 'success' in data) {
      if (data.success) {
        return { data: data.data as T, error: null, status: res.status };
      } else {
        return {
          data: null,
          error: data.error || 'Yêu cầu không thành công',
          status: res.status,
        };
      }
    }

    // Return raw data if not in API format
    return { data: data as T, error: null, status: res.status };
  } catch (err) {
    // Network error or other unexpected error
    console.error('[safeFetch] Error:', err);
    return {
      data: null,
      error: 'Không thể kết nối đến máy chủ',
      status: 0,
    };
  }
}

/**
 * POST request with JSON body
 */
export async function safePost<T>(
  url: string,
  body: unknown,
  options?: RequestInit
): Promise<FetchResult<T>> {
  return safeFetch<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * PUT request with JSON body
 */
export async function safePut<T>(
  url: string,
  body: unknown,
  options?: RequestInit
): Promise<FetchResult<T>> {
  return safeFetch<T>(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * PATCH request with JSON body
 */
export async function safePatch<T>(
  url: string,
  body: unknown,
  options?: RequestInit
): Promise<FetchResult<T>> {
  return safeFetch<T>(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * DELETE request
 */
export async function safeDelete<T>(
  url: string,
  options?: RequestInit
): Promise<FetchResult<T>> {
  return safeFetch<T>(url, {
    method: 'DELETE',
    ...options,
  });
}
