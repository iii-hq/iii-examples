#!/usr/bin/env python3
"""
Python Analytics Service - stdin/stdout JSON-RPC
NO HTTP ENDPOINTS - communicates via IPC only

This demonstrates that iii-engine can coordinate services that don't use HTTP.
The Node.js data-requester spawns this script and communicates via stdin/stdout.
"""

import json
import sys
import time
import hashlib
from typing import Any

def compute_risk_score(user_id: str, email: str, name: str) -> dict:
    """
    Compute a risk score for user onboarding.
    Simulates ML model inference with fake delays.
    """
    time.sleep(0.05)

    factors = []
    score = 50.0

    domain = email.split('@')[-1] if '@' in email else ''

    if domain in ('gmail.com', 'yahoo.com', 'hotmail.com'):
        score += 10
        factors.append('common_email_provider')
    elif domain.endswith('.edu'):
        score -= 15
        factors.append('educational_domain')
    elif domain.endswith('.gov'):
        score -= 20
        factors.append('government_domain')
    else:
        score += 5
        factors.append('custom_domain')

    if len(name.split()) >= 2:
        score -= 5
        factors.append('full_name_provided')
    else:
        score += 10
        factors.append('single_name_only')

    hash_val = int(hashlib.sha256(user_id.encode()).hexdigest()[:8], 16)
    variance = (hash_val % 20) - 10
    score += variance

    score = max(0, min(100, score))

    return {
        'userId': user_id,
        'riskScore': round(score, 2),
        'factors': factors,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }


def compute_metrics(users: list) -> dict:
    """
    Aggregate onboarding metrics from user list.
    """
    if not users:
        return {
            'totalUsers': 0,
            'averageRiskScore': 0,
            'planDistribution': {}
        }

    total_risk = sum(u.get('riskScore', 50) for u in users)
    avg_risk = total_risk / len(users)

    plan_dist: dict[str, int] = {}
    for u in users:
        plan = u.get('plan', 'free')
        plan_dist[plan] = plan_dist.get(plan, 0) + 1

    return {
        'totalUsers': len(users),
        'averageRiskScore': round(avg_risk, 2),
        'planDistribution': plan_dist
    }


def handle_request(method: str, params: Any) -> Any:
    """
    Route JSON-RPC methods to handlers.
    """
    if method == 'ping':
        return {'status': 'ok', 'service': 'python-analytics'}

    if method == 'score':
        user_id = params.get('userId', '')
        email = params.get('email', '')
        name = params.get('name', '')
        return compute_risk_score(user_id, email, name)

    if method == 'metrics':
        users = params.get('users', [])
        return compute_metrics(users)

    raise ValueError(f'Unknown method: {method}')


def main():
    """
    Main loop: read JSON from stdin, write JSON to stdout.
    Each line is a complete JSON-RPC request.
    """
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
            req_id = request.get('id', 0)
            method = request.get('method', '')
            params = request.get('params', {})

            result = handle_request(method, params)
            response = {'id': req_id, 'result': result}

        except json.JSONDecodeError as e:
            response = {'id': 0, 'error': {'message': f'Invalid JSON: {e}'}}
        except Exception as e:
            response = {'id': request.get('id', 0), 'error': {'message': str(e)}}

        sys.stdout.write(json.dumps(response) + '\n')
        sys.stdout.flush()


if __name__ == '__main__':
    main()
