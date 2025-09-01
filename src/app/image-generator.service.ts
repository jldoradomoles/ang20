import { Injectable } from '@angular/core';
import { countryIsoMap } from './countries.config';

@Injectable({ providedIn: 'root' })
export class ImageGeneratorService {
  private countryIsoMap = countryIsoMap;
  private apiUrl = 'https://flagcdn.com/w320'; // FlagCDN PNG API

  async generateFlag(countryName: string): Promise<string> {
    // Usar el código ISO si existe en el mapeo
    const isoCode = (this.countryIsoMap[countryName] || countryName).toLowerCase();
    const url = `${this.apiUrl}/${isoCode}.png`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error al generar la imagen: ${response.status}`);
    }
    // Devuelve la URL directa de la imagen PNG
    return url;
  }
}
