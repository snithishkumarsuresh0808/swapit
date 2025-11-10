from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Ringtone
from .serializers import RingtoneSerializer


class RingtoneListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ringtones = Ringtone.objects.filter(user=request.user)
        serializer = RingtoneSerializer(ringtones, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class RingtoneUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        audio_file = request.FILES.get('audio_file')
        name = request.data.get('name', 'Custom Ringtone')

        if not audio_file:
            return Response(
                {'error': 'Please provide an audio file'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        if not audio_file.content_type.startswith('audio/'):
            return Response(
                {'error': 'File must be an audio file'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (max 5MB)
        if audio_file.size > 5 * 1024 * 1024:
            return Response(
                {'error': 'File size must be less than 5MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Deactivate all existing ringtones for this user
        Ringtone.objects.filter(user=request.user).update(is_active=False)

        # Create ringtone and set as active automatically
        ringtone = Ringtone.objects.create(
            user=request.user,
            name=name,
            audio_file=audio_file,
            is_active=True  # Auto-activate newly uploaded ringtone
        )

        print(f"🔔 New ringtone uploaded and activated for user {request.user.id}: {name}")

        serializer = RingtoneSerializer(ringtone, context={'request': request})
        return Response(
            {
                'message': 'Ringtone uploaded and activated successfully',
                'ringtone': serializer.data
            },
            status=status.HTTP_201_CREATED
        )


class RingtoneDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            ringtone = Ringtone.objects.get(pk=pk, user=request.user)
            ringtone.delete()
            return Response(
                {'message': 'Ringtone deleted successfully'},
                status=status.HTTP_200_OK
            )
        except Ringtone.DoesNotExist:
            return Response(
                {'error': 'Ringtone not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class SetActiveRingtoneView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            # Deactivate all other ringtones
            Ringtone.objects.filter(user=request.user).update(is_active=False)

            # Activate the selected ringtone
            ringtone = Ringtone.objects.get(pk=pk, user=request.user)
            ringtone.is_active = True
            ringtone.save()

            serializer = RingtoneSerializer(ringtone, context={'request': request})
            return Response(
                {
                    'message': 'Ringtone activated successfully',
                    'ringtone': serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Ringtone.DoesNotExist:
            return Response(
                {'error': 'Ringtone not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ActiveRingtoneView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            ringtone = Ringtone.objects.get(user=request.user, is_active=True)
            serializer = RingtoneSerializer(ringtone, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Ringtone.DoesNotExist:
            return Response(
                {'error': 'No active ringtone set'},
                status=status.HTTP_404_NOT_FOUND
            )
