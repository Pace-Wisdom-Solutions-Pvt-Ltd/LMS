# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import logging

logger = logging.getLogger(__name__)

def get_subdomain(request):
    """
    Extracts the subdomain from the request's host.
    Handles 'localhost', IP addresses, and production domains.
    Returns None if no subdomain is present (Main Domain).
    """
    import ipaddress
    host_with_port = request.get_host().lower()
    host = host_with_port.split(':')[0]
    parts = host.split('.')
    
    # 1. Direct Localhost/IP cases
    if host == 'localhost' or host == '127.0.0.1' or host == '::1':
        return None
        
    # Check if host is an IP address
    try:
        ipaddress.ip_address(host)
        return None
    except ValueError:
        pass # Not an IP
        
    if host.endswith('.localhost'):
        # e.g., 'pace.localhost' -> 'pace'
        return parts[0]
        
    # 2. Production Domain cases
    # We assume the main domain has exactly 2 parts (e.g., lms.com)
    if len(parts) > 2:
        # e.g., 'pace.lms.com' -> 'pace'
        return parts[0]
        
    return None

