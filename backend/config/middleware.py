class TrailingSlashMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info
        if path.startswith('/api/') and not path.endswith('/') and path != '/api/':
            request.path_info = path + '/'
            request.path = request.path + '/'
        response = self.get_response(request)
        return response
