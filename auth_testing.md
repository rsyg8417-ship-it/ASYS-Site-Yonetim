# ASYS Auth Testing Playbook

## First-run setup (mandatory before login)
```
curl -X GET http://localhost:8001/api/setup/status
# Response: {"setup_required": true}

curl -X POST http://localhost:8001/api/setup/admin \
  -H "Content-Type: application/json" \
  -d '{"email":"rsyg8417@gmail.com","name":"Yönetici","password":"Admin123!"}'
# Response: {user, access_token}
```

## Login (post-setup)
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rsyg8417@gmail.com","password":"Admin123!"}'
```

## Verify
```
curl -b cookies.txt http://localhost:8001/api/auth/me
```

## Mongo verification
```
mongosh
use asys_database
db.users.find({role:"admin"}).pretty()
# password_hash should start with $2b$
db.users.getIndexes()  # email unique
```
