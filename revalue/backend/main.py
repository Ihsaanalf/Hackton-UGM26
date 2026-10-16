
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from pwdlib import PasswordHash

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security

from database import engine, Base, SessionLocal
import models
import jwt


app = FastAPI(
    title="ReValue Backend API",
    version="1.0.0",
    description="Backend platform ReValue untuk pengelolaan sampah menjadi bernilai"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Membuat tabel database
Base.metadata.create_all(bind=engine)


# Database session
def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


password_hash = PasswordHash.recommended()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


SECRET_KEY = "ganti-dengan-kunci-rahasia-acak-yang-panjang"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id = int(payload.get("sub"))

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Token tidak valid atau sudah kedaluwarsa",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .first()
    )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Pengguna tidak ditemukan atau tidak aktif"
        )

    return user

def require_role(*allowed_roles: str):
    def role_checker(
        current_user: models.User = Depends(get_current_user)
    ):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Akses ditolak: role tidak memiliki izin"
            )
        return current_user

    return role_checker

@app.get("/")
def root():
    return {
        "success": True,
        "message": "ReValue Backend is running"
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "ReValue Backend",
        "status": "healthy"
    }


@app.get("/materials")
def get_materials(db: Session = Depends(get_db)):
    materials = db.query(models.Material).all()

    return {
        "success": True,
        "count": len(materials),
        "materials": [
            {
                "id": material.id,
                "name": material.name,
                "price_per_kg": material.price_per_kg,
                "min_weight_kg": material.min_weight_kg,
                "is_exchangeable": material.is_exchangeable
            }
            for material in materials
        ]
    }

@app.post("/materials/seed")
def seed_materials(db: Session = Depends(get_db)):
    materials = [
        {
            "name": "Plastic",
            "price_per_kg": 4500,
            "min_weight_kg": 1.0,
            "is_exchangeable": True
        },
        {
            "name": "Paper_Cardboard",
            "price_per_kg": 2500,
            "min_weight_kg": 1.0,
            "is_exchangeable": True
        },
        {
            "name": "Glass",
            "price_per_kg": 1500,
            "min_weight_kg": 1.0,
            "is_exchangeable": True
        },
        {
            "name": "Metal",
            "price_per_kg": 6000,
            "min_weight_kg": 1.0,
            "is_exchangeable": True
        },
        {
            "name": "Organic",
            "price_per_kg": 0,
            "min_weight_kg": 0,
            "is_exchangeable": False
        },
        {
            "name": "Other",
            "price_per_kg": 0,
            "min_weight_kg": 0,
            "is_exchangeable": False
        }
    ]

    added = []

    for item in materials:
        existing = (
            db.query(models.Material)
            .filter(models.Material.name == item["name"])
            .first()
        )

        if not existing:
            material = models.Material(**item)
            db.add(material)
            added.append(item["name"])

    db.commit()

    return {
        "success": True,
        "message": "Initial materials seeded",
        "added": added
    }

@app.get("/calculate")
def calculate_value(
    material_name: str,
    weight_kg: float,
    db: Session = Depends(get_db)
):
    # Cari material berdasarkan nama
    material = (
        db.query(models.Material)
        .filter(models.Material.name == material_name)
        .first()
    )

    # Material tidak ditemukan
    if not material:
        return {
            "success": False,
            "message": f"Material '{material_name}' tidak ditemukan"
        }

    # Material tidak bisa ditukar
    if not material.is_exchangeable:
        return {
            "success": True,
            "exchangeable": False,
            "material": material.name,
            "weight_kg": weight_kg,
            "message": "Material ini belum dapat ditukar menjadi uang"
        }

    # Validasi berat
    if weight_kg <= 0:
        return {
            "success": False,
            "message": "Berat harus lebih dari 0 kg"
        }

    # Hitung nilai
    gross_value = weight_kg * material.price_per_kg

    # Biaya pickup sementara
    pickup_fee = 1000

    # Nilai bersih
    net_value = max(gross_value - pickup_fee, 0)

    # Cek minimum berat
    minimum_reached = weight_kg >= material.min_weight_kg

    return {
        "success": True,
        "exchangeable": True,
        "material": material.name,
        "weight_kg": weight_kg,
        "price_per_kg": material.price_per_kg,
        "gross_value": gross_value,
        "pickup_fee": pickup_fee,
        "net_value": net_value,
        "minimum_weight_kg": material.min_weight_kg,
        "minimum_reached": minimum_reached
    }

@app.post("/transactions")
def create_transaction(
    material_name: str,
    estimated_weight_kg: float,
    db: Session = Depends(get_db)
):
    # Cari material
    material = (
        db.query(models.Material)
        .filter(models.Material.name == material_name)
        .first()
    )

    if not material:
        return {
            "success": False,
            "message": f"Material '{material_name}' tidak ditemukan"
        }

    # Validasi berat
    if estimated_weight_kg <= 0:
        return {
            "success": False,
            "message": "Berat harus lebih dari 0 kg"
        }

    # Material tidak bisa ditukar
    if not material.is_exchangeable:
        return {
            "success": True,
            "exchangeable": False,
            "message": "Material ini belum dapat ditukar menjadi uang"
        }

    # Hitung nilai transaksi
    gross_value = estimated_weight_kg * material.price_per_kg
    pickup_fee = 1000
    net_value = max(gross_value - pickup_fee, 0)

    # Buat transaksi
    transaction = models.Transaction(
        material_name=material.name,
        estimated_weight_kg=estimated_weight_kg,
        price_per_kg=material.price_per_kg,
        gross_value=gross_value,
        pickup_fee=pickup_fee,
        net_value=net_value,
        status="pending"
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return {
        "success": True,
        "message": "Transaction created",
        "transaction": {
            "id": transaction.id,
            "material_name": transaction.material_name,
            "estimated_weight_kg": transaction.estimated_weight_kg,
            "price_per_kg": transaction.price_per_kg,
            "gross_value": transaction.gross_value,
            "pickup_fee": transaction.pickup_fee,
            "net_value": transaction.net_value,
            "status": transaction.status
        }
    }

@app.post("/pickup")
def create_pickup(
    transaction_id: int,
    address: str,
    db: Session = Depends(get_db)
):
    transaction = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
        .first()
    )

    if not transaction:
        return {
            "success": False,
            "message": "Transaction tidak ditemukan"
        }

    if transaction.status != "pending":
        return {
            "success": False,
            "message": "Transaction tidak dapat mengajukan pickup"
        }

    pickup = models.PickupRequest(
        transaction_id=transaction_id,
        address=address,
        status="requested"
    )

    transaction.status = "pickup_requested"

    db.add(pickup)
    db.commit()
    db.refresh(pickup)

    return {
        "success": True,
        "message": "Pickup request created",
        "pickup": {
            "id": pickup.id,
            "transaction_id": pickup.transaction_id,
            "address": pickup.address,
            "status": pickup.status,
            "collector_name": pickup.collector_name
        }
    }

@app.get("/pickup/available")
def get_available_pickups(db: Session = Depends(get_db)):
    pickups = (
        db.query(models.PickupRequest)
        .filter(models.PickupRequest.status == "requested")
        .all()
    )

    return {
        "success": True,
        "count": len(pickups),
        "pickups": [
            {
                "id": pickup.id,
                "transaction_id": pickup.transaction_id,
                "address": pickup.address,
                "status": pickup.status,
                "collector_name": pickup.collector_name
            }
            for pickup in pickups
        ]
    }

@app.post("/pickup/{pickup_id}/assign")
def assign_pickup(
    pickup_id: int,
    collector_name: str,
    db: Session = Depends(get_db)
):
    pickup = (
        db.query(models.PickupRequest)
        .filter(models.PickupRequest.id == pickup_id)
        .first()
    )

    if not pickup:
        return {
            "success": False,
            "message": "Pickup tidak ditemukan"
        }

    if pickup.status != "requested":
        return {
            "success": False,
            "message": "Pickup tidak dapat di-assign"
        }

    pickup.collector_name = collector_name
    pickup.status = "assigned"

    db.commit()
    db.refresh(pickup)

    return {
        "success": True,
        "message": "Pickup assigned",
        "pickup": {
            "id": pickup.id,
            "transaction_id": pickup.transaction_id,
            "address": pickup.address,
            "status": pickup.status,
            "collector_name": pickup.collector_name
        }
    }


@app.post("/pickup/{pickup_id}/status")
def update_pickup_status(
    pickup_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    pickup = (
        db.query(models.PickupRequest)
        .filter(models.PickupRequest.id == pickup_id)
        .first()
    )

    if not pickup:
        return {
            "success": False,
            "message": "Pickup tidak ditemukan"
        }

    allowed_transitions = {
        "assigned": ["on_the_way"],
        "on_the_way": ["collected"]
    }

    allowed_next_statuses = allowed_transitions.get(
        pickup.status, []
    )

    if status not in allowed_next_statuses:
        return {
            "success": False,
            "message": (
                f"Status tidak valid: {pickup.status} "
                f"tidak dapat berubah menjadi {status}"
            )
        }

    pickup.status = status

    db.commit()
    db.refresh(pickup)

    return {
        "success": True,
        "message": "Pickup status updated",
        "pickup": {
            "id": pickup.id,
            "transaction_id": pickup.transaction_id,
            "address": pickup.address,
            "status": pickup.status,
            "collector_name": pickup.collector_name
        }
    }

@app.post("/transactions/{transaction_id}/verify-weight")
def verify_transaction_weight(
    transaction_id: int,
    actual_weight_kg: float,
    db: Session = Depends(get_db)
):
    # 1. Cari transaksi
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id
    ).first()

    if not transaction:
        return {
            "success": False,
            "message": "Transaksi tidak ditemukan"
        }

    # 2. Pastikan pickup sudah selesai dikumpulkan
    pickup = db.query(models.PickupRequest).filter(
        models.PickupRequest.transaction_id == transaction_id
    ).first()

    if not pickup:
        return {
            "success": False,
            "message": "Pickup untuk transaksi ini belum dibuat"
        }

    if pickup.status != "collected":
        return {
            "success": False,
            "message": "Berat hanya dapat diverifikasi setelah sampah dikumpulkan"
        }

    # 3. Cegah verifikasi berulang
    if transaction.status == "verified":
        return {
            "success": False,
            "message": "Transaksi sudah diverifikasi"
        }

    # 4. Validasi berat aktual
    if actual_weight_kg <= 0:
        return {
            "success": False,
            "message": "Berat aktual harus lebih dari 0 kg"
        }

    # 5. Cari data material
    material = db.query(models.Material).filter(
        models.Material.name == transaction.material_name
    ).first()

    if not material or not material.is_exchangeable:
        return {
            "success": False,
            "message": "Material ini tidak dapat ditukar menjadi uang"
        }

    # 6. Hitung ulang berdasarkan berat aktual
    gross_value = actual_weight_kg * transaction.price_per_kg
    pickup_fee = transaction.pickup_fee
    net_value = max(gross_value - pickup_fee, 0)

    # 7. Simpan hasil verifikasi
    transaction.actual_weight_kg = actual_weight_kg
    transaction.gross_value = gross_value
    transaction.net_value = net_value
    transaction.status = "verified"

    # Tandai pickup sudah ditimbang
    pickup.status = "weighed"

    db.commit()
    db.refresh(transaction)
    db.refresh(pickup)

    return {
        "success": True,
        "message": "Berat aktual berhasil diverifikasi",
        "transaction_id": transaction.id,
        "material": transaction.material_name,
        "estimated_weight_kg": transaction.estimated_weight_kg,
        "actual_weight_kg": transaction.actual_weight_kg,
        "price_per_kg": transaction.price_per_kg,
        "gross_value": transaction.gross_value,
        "pickup_fee": transaction.pickup_fee,
        "net_value": transaction.net_value,
        "transaction_status": transaction.status,
        "pickup_status": pickup.status
    }

@app.get("/wallet")
def get_wallet(db: Session = Depends(get_db)):
    wallet = db.query(models.Wallet).first()

    if not wallet:
        wallet = models.Wallet(balance=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    return {
        "success": True,
        "wallet_id": wallet.id,
        "balance": wallet.balance
    }


@app.post("/wallet/credit/{transaction_id}")
def credit_wallet(
    transaction_id: int,
    db: Session = Depends(get_db)
):
    # Cari transaksi ReValue
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id
    ).first()

    if not transaction:
        return {
            "success": False,
            "message": "Transaksi tidak ditemukan"
        }

    # Hanya transaksi terverifikasi yang boleh dikreditkan
    if transaction.status != "verified":
        return {
            "success": False,
            "message": "Transaksi belum diverifikasi"
        }

    # Pastikan transaksi belum pernah dikreditkan
    existing_credit = db.query(
        models.WalletTransaction
    ).filter(
        models.WalletTransaction.transaction_id == transaction_id
    ).first()

    if existing_credit:
        return {
            "success": False,
            "message": "Transaksi ini sudah dikreditkan ke wallet"
        }

    if transaction.net_value <= 0:
        return {
            "success": False,
            "message": "Nilai bersih transaksi harus lebih dari 0"
        }

    # Ambil atau buat wallet demo
    wallet = db.query(models.Wallet).first()

    if not wallet:
        wallet = models.Wallet(balance=0.0)
        db.add(wallet)
        db.flush()

    # Tambahkan saldo dan catat mutasi
    amount = transaction.net_value
    wallet.balance += amount

    history = models.WalletTransaction(
        wallet_id=wallet.id,
        transaction_id=transaction.id,
        amount=amount,
        transaction_type="credit",
        description=f"Pencairan hasil penukaran {transaction.material_name}"
    )

    db.add(history)
    db.commit()
    db.refresh(wallet)

    return {
        "success": True,
        "message": "Saldo berhasil ditambahkan",
        "transaction_id": transaction.id,
        "amount_credited": amount,
        "wallet_balance": wallet.balance
    }


@app.get("/wallet/history")
def get_wallet_history(db: Session = Depends(get_db)):
    wallet = db.query(models.Wallet).first()

    if not wallet:
        return {
            "success": True,
            "balance": 0.0,
            "count": 0,
            "history": []
        }

    histories = (
        db.query(models.WalletTransaction)
        .filter(models.WalletTransaction.wallet_id == wallet.id)
        .order_by(models.WalletTransaction.id.desc())
        .all()
    )

    return {
        "success": True,
        "wallet_id": wallet.id,
        "balance": wallet.balance,
        "count": len(histories),
        "history": [
            {
                "id": item.id,
                "transaction_id": item.transaction_id,
                "amount": item.amount,
                "type": item.transaction_type,
                "description": item.description
            }
            for item in histories
        ]
    }


@app.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()

    # Cek email yang sudah terdaftar
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email sudah terdaftar"
        )

    # Validasi input
    if not data.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Nama tidak boleh kosong"
        )

    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password minimal 8 karakter"
        )

    # Simpan akun baru dengan password yang di-hash
    user = models.User(
        name=data.name.strip(),
        email=email,
        hashed_password=password_hash.hash(data.password),
        role="user",
        is_active=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "Registrasi berhasil",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }


@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()

    # Cari akun berdasarkan email
    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    # Periksa email dan password
    if not user or not password_hash.verify(
        data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Email atau password salah"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Akun tidak aktif"
        )

    # Buat token JWT
    from datetime import datetime, timedelta, timezone

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    token = jwt.encode(
        {
            "sub": str(user.id),
            "role": user.role,
            "exp": expires_at
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "success": True,
        "message": "Login berhasil",
        "access_token": token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }


@app.get("/me")
def get_my_profile(
    current_user: models.User = Depends(get_current_user)
):
    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role
        }
    }


@app.get("/user/test")
def user_test(
    current_user: models.User = Depends(require_role("user"))
):
    return {
        "success": True,
        "message": "Akses user berhasil",
        "user_id": current_user.id
    }


@app.get("/admin/test")
def admin_test(
    current_user: models.User = Depends(require_role("admin"))
):
    return {
        "success": True,
        "message": "Akses admin berhasil",
        "user_id": current_user.id
    }
