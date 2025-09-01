import { Component, signal } from '@angular/core';
import { inject } from '@angular/core';
import { ImageGeneratorService } from './image-generator.service';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { countries, type Country } from './countries.config';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('ang20');
  private imageGenerator = inject(ImageGeneratorService);
  isLoading = signal(false);
  isDownloading = signal(false);
  selectedContinent = '';
  images = signal<{ url: string; country: Country }[]>([]);

  onContinentChange(value: any | null) {
    this.selectedContinent = value.value;
  }

  continents = [
    { value: 'africa', label: 'África' },
    { value: 'asia', label: 'Asia' },
    { value: 'europe', label: 'Europa' },
    { value: 'north_america', label: 'América del Norte' },
    { value: 'south_america', label: 'América del Sur' },
    { value: 'australia_oceania', label: 'Australia / Oceanía' },
  ];

  countries = countries;

  private async roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  async generateImages() {
    this.isLoading.set(true);
    this.images.set([]);

    const selectedCountries = this.countries[this.selectedContinent as keyof typeof this.countries];

    // Mezclar el array de países de forma aleatoria
    const shuffledCountries = [...selectedCountries].sort(() => Math.random() - 0.5);

    // Tomar solo los primeros 15 países aleatorios
    const randomCountries = shuffledCountries.slice(0, 15);

    for (const country of randomCountries) {
      try {
        const imageUrl = await this.imageGenerator.generateFlag(country.name);
        this.images.update((currentImages) => [...currentImages, { url: imageUrl, country }]);
      } catch (error) {
        console.error(`Error generando la bandera para ${country.name}:`, error);
      }
    }
    this.isLoading.set(false);
  }

  async downloadZip() {
    this.isDownloading.set(true);
    const selectedContinent = this.selectedContinent;

    if (this.images().length === 0) {
      console.error('No hay diseños para descargar.');
      this.isDownloading.set(false);
      return;
    }

    const PngSize = 945;
    const padding = 50;

    const zip = new JSZip();

    for (const image of this.images()) {
      const countryName = image.country.name;
      const capital = image.country.capital;

      const canvas = document.createElement('canvas');
      canvas.width = PngSize;
      canvas.height = PngSize;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cardContentWidth = PngSize - padding * 2;
      const cardContentHeight = PngSize - padding * 2;

      ctx.fillStyle = '#fff';
      await this.roundRect(ctx, padding, padding, cardContentWidth, cardContentHeight, 20);
      ctx.fill();

      const newImage = new Image();
      newImage.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        newImage.onload = () => resolve();
        newImage.src = image.url;
      });

      const flagWidth = cardContentWidth - padding * 2;
      const flagHeight = flagWidth * 0.6;
      const flagY = padding * 2;
      ctx.drawImage(newImage, padding * 2, flagY, flagWidth, flagHeight);

      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 50px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(countryName, PngSize / 2, flagY + flagHeight + 50);

      ctx.fillStyle = '#6b7280';
      ctx.font = '36px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(capital, PngSize / 2, flagY + flagHeight + 100);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const cleanFileName = countryName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        zip.file(`${cleanFileName}.png`, blob);
      }
    }

    zip
      .generateAsync({ type: 'blob' })
      .then((content: Blob) => {
        saveAs(content, `diseños_${selectedContinent}.zip`);
        this.isDownloading.set(false);
      })
      .catch((error: any) => {
        console.error('Error generating zip file:', error);
        console.error('Hubo un error al generar el archivo ZIP. Inténtalo de nuevo.');
        this.isDownloading.set(false);
      });
  }
}
