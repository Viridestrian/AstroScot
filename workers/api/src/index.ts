import type { PrototypeCard } from '@astroscot/shared';

const placeholderCards: PrototypeCard[] = [
  {
    title: 'Weather',
    status: 'placeholder',
    message: 'Open-Meteo weather integration will be added later.',
  },
  {
    title: 'Moon',
    status: 'placeholder',
    message: 'Moon phase, moonrise, moonset, and full moon events will be added later.',
  },
  {
    title: 'Planet Watching',
    status: 'placeholder',
    message: 'Planet visibility calculations will be added later.',
  },
];

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);

    if (url.pathname !== '/') {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({
      name: 'AstroScot API',
      status: 'prototype',
      message: 'AstroScot Worker foundation is running.',
      cards: placeholderCards,
    });
  },
};
