import socket
import sys

ports = [25, 465, 587, 2525]
hosts = ['smtp.gmail.com', '8.8.8.8']  # Test și Google DNS pentru comparație

for host in hosts:
    print(f"\n=== Testing {host} ===")
    for port in ports:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        try:
            result = sock.connect_ex((host, port))
            if result == 0:
                print(f"✓ Port {port}: OPEN")
            else:
                print(f"✗ Port {port}: BLOCKED (error: {result})")
        except Exception as e:
            print(f"✗ Port {port}: ERROR - {e}")
        finally:
            sock.close()
