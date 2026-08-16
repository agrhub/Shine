export interface VideoRenderJob {
  jobId: string;
  seriesId: string;
  episodeId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  videoUrl?: string;
  ssimParityScore?: number;
}

export class VideoService {
  private jobs: Map<string, VideoRenderJob> = new Map();

  async startRenderJob(seriesId: string, episodeId: string): Promise<VideoRenderJob> {
    const jobId = `job_${Date.now()}`;
    const job: VideoRenderJob = {
      jobId,
      seriesId,
      episodeId,
      status: 'PROCESSING',
      progress: 10,
    };
    this.jobs.set(jobId, job);
    return job;
  }

  getJobStatus(jobId: string): VideoRenderJob | undefined {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'PROCESSING') {
      job.progress = Math.min(100, job.progress + 30);
      if (job.progress >= 100) {
        job.status = 'COMPLETED';
        job.videoUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBtkqUzKdcAYE1FhPsRYFIBbnfRkblPXgHUmyY2lO08hNiz9EwgjWw1MyufKF9NAOd561vhT54S9rHPjh7mk5DNdM3bdmAfnJn-oKwmvO7pMxhtB3TNPg-EGe9RK1EPnuZCnS-pCTmPAN6DilaM9Pnjtl5EOHd9QZP7lcBybJui1CzT_WCS5RzXGcrC4Aph9CSWziB0m12r78bXGkolWf3uivcxZyONaKfKL1rZfmc9HqFbpdoOlQsUBA';
        job.ssimParityScore = 0.985;
      }
    }
    return job;
  }
}

export const videoService = new VideoService();
