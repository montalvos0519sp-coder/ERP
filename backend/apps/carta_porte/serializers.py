from rest_framework import serializers

from .models import Autotransporte, CartaPorte, CartaPorteUbicacion, Mercancia, Operador, Ubicacion


class UbicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ubicacion
        fields = "__all__"


class AutotransporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Autotransporte
        fields = "__all__"


class OperadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operador
        fields = "__all__"


class CartaPorteUbicacionSerializer(serializers.ModelSerializer):
    ubicacion_data = UbicacionSerializer(source="ubicacion", read_only=True)

    class Meta:
        model = CartaPorteUbicacion
        fields = "__all__"
        read_only_fields = ["carta_porte"]


class MercanciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mercancia
        fields = "__all__"
        read_only_fields = ["carta_porte"]


class CartaPorteSerializer(serializers.ModelSerializer):
    ubicaciones_cp = CartaPorteUbicacionSerializer(many=True, required=False)
    mercancias = MercanciaSerializer(many=True, required=False)
    operador_data = OperadorSerializer(source="operador", read_only=True)
    autotransporte_data = AutotransporteSerializer(source="autotransporte", read_only=True)

    class Meta:
        model = CartaPorte
        fields = "__all__"
        read_only_fields = ["estado", "folio_fiscal", "xml", "pdf", "creado"]

    def create(self, validated_data):
        ubics = validated_data.pop("ubicaciones_cp", [])
        mercs = validated_data.pop("mercancias", [])
        cp = CartaPorte.objects.create(**validated_data)
        for u in ubics:
            CartaPorteUbicacion.objects.create(carta_porte=cp, **u)
        for m in mercs:
            Mercancia.objects.create(carta_porte=cp, **m)
        return cp

    def update(self, instance, validated_data):
        ubics = validated_data.pop("ubicaciones_cp", None)
        mercs = validated_data.pop("mercancias", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if ubics is not None:
            instance.ubicaciones_cp.all().delete()
            for u in ubics:
                CartaPorteUbicacion.objects.create(carta_porte=instance, **u)
        if mercs is not None:
            instance.mercancias.all().delete()
            for m in mercs:
                Mercancia.objects.create(carta_porte=instance, **m)
        return instance
