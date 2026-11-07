import { NextResponse } from 'next/server';
import { SocialPublisherService, PublishRequestPayload } from '../../../../modules/social/SocialPublisherService';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PublishRequestPayload;

    if (!body.platforms || body.platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Debes seleccionar al menos una plataforma de publicación.' },
        { status: 400 }
      );
    }

    const results = await SocialPublisherService.publishAll(body);
    const hasErrors = results.some((r) => r.status === 'ERROR');

    return NextResponse.json({
      success: !hasErrors,
      results,
      summary: `Procesadas ${results.length} plataformas con éxito.`,
    });
  } catch (error: any) {
    console.error('[API Social Publish] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno al procesar publicación' },
      { status: 500 }
    );
  }
}

