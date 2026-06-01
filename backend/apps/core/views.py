"""Vistas de la app core."""
from __future__ import annotations

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import QuerySet
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    CertificadoCSD,
    ConfiguracionEmpresa,
    Empresa,
    PerfilUsuario,
    Sucursal,
    UsuarioEmpresa,
)
from .permissions import EsStaffEmpresa
from .serializers import (
    CertificadoCSDSerializer,
    ConfiguracionEmpresaSerializer,
    CrearUsuarioSerializer,
    EmpresaSerializer,
    LoginSerializer,
    PerfilUsuarioSerializer,
    SucursalSerializer,
    UserSerializer,
    UsuarioEmpresaSerializer,
)


# ── Autenticacion ───────────────────────────────────────────────────────────
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if not user or not user.is_active:
            return Response({"detail": "Credenciales invalidas."}, status=401)
        login(request, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        })


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"ok": True})


class MeView(APIView):
    # GET permite anonymous: devuelve {authenticated: false} con 200 en vez de
    # 401, para evitar ruido de consola en el navegador cuando se carga la app
    # sin sesion. PATCH si requiere autenticacion.
    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False}, status=200)
        data = UserSerializer(request.user, context={"request": request}).data
        data["authenticated"] = True
        return Response(data)

    def patch(self, request):
        perfil, _ = PerfilUsuario.objects.get_or_create(user=request.user)
        ser = PerfilUsuarioSerializer(perfil, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)


# ── ViewSets ────────────────────────────────────────────────────────────────
class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["nombre_comercial", "razon_social", "rfc"]

    def get_queryset(self) -> QuerySet[Empresa]:
        u = self.request.user
        if u.is_superuser:
            return Empresa.objects.all()
        ids = u.empresas.filter(activo=True).values_list("empresa_id", flat=True)
        return Empresa.objects.filter(id__in=ids)

    @action(detail=True, methods=["post", "delete"], url_path="logo",
            permission_classes=[permissions.IsAuthenticated, EsStaffEmpresa],
            parser_classes=[MultiPartParser, FormParser])
    def subir_logo(self, request, pk=None):
        """Sube o elimina el logo de la empresa."""
        empresa = self.get_object()
        if request.method == "DELETE":
            if empresa.logo:
                empresa.logo.delete(save=False)
            empresa.logo = None
            empresa.save(update_fields=["logo"])
            return Response({"ok": True, "logo": None})
        archivo = request.FILES.get("logo")
        if not archivo:
            return Response({"detail": "Falta 'logo' (archivo)."}, status=400)
        if empresa.logo:
            empresa.logo.delete(save=False)
        empresa.logo = archivo
        empresa.save()
        return Response({"ok": True, "logo": empresa.logo.url if empresa.logo else None})


class SucursalViewSet(viewsets.ModelViewSet):
    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa"]


class ConfiguracionEmpresaViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionEmpresa.objects.all()
    serializer_class = ConfiguracionEmpresaSerializer
    permission_classes = [permissions.IsAuthenticated, EsStaffEmpresa]
    lookup_field = "empresa_id"
    lookup_url_kwarg = "empresa_id"


class CertificadoCSDViewSet(viewsets.ModelViewSet):
    queryset = CertificadoCSD.objects.all()
    serializer_class = CertificadoCSDSerializer
    permission_classes = [permissions.IsAuthenticated, EsStaffEmpresa]
    filterset_fields = ["empresa", "activo"]

    def perform_create(self, serializer):
        serializer.save(subido_por=self.request.user)


class UsuarioEmpresaViewSet(viewsets.ModelViewSet):
    queryset = UsuarioEmpresa.objects.select_related("user", "empresa").all()
    serializer_class = UsuarioEmpresaSerializer
    permission_classes = [permissions.IsAuthenticated, EsStaffEmpresa]
    filterset_fields = ["empresa", "user", "rol", "activo"]


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, EsStaffEmpresa]
    search_fields = ["username", "email", "first_name", "last_name"]

    def get_serializer_class(self):
        if self.action == "create":
            return CrearUsuarioSerializer
        return UserSerializer

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        nueva = request.data.get("password")
        if not nueva or len(nueva) < 6:
            return Response({"detail": "Password muy corta."}, status=400)
        user.set_password(nueva)
        user.save()
        return Response({"ok": True})

    @action(detail=True, methods=["post"])
    def activar(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({"ok": True, "is_active": user.is_active})
