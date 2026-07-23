import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Important for *ngIf/*ngFor

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  constructor(private router: Router) {}

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  // --- INSTRUCTIONS LOGIC ---
  showInstructions = false;
  instructionStep = 0;

  readonly tutorialSteps = [
    {
      title: 'WHY MAP VETOES?',
      image: 'public/tutorial/pickban-intro.jpg', 
      text: 'In competitive Valorant, map advantage is everything. The Veto System allows teams to strategically ban their weakest maps and pick their strongest, ensuring a fair and tactical series before the match even begins.'
    },
    {
      title: 'Joining your pickban',
      image: 'public/tutorial/joinmatch.jpg', 
      text: 'Joining the lobby as a team captain is easy. Just navigate to "JOIN MATCH", enter the match ID, press "JOIN AS CAPTAIN", and choose your team.'
    },
    {
      title: 'PHASE 1: BANNING',
      image: 'public/tutorial/mapbanned.jpg', 
      text: 'The process starts with Bans. Captains take turns removing maps from the pool. If a map is banned (marked in Red), it will not be played. Use this phase to deny your opponent their best playground.'
    },
    {
      title: 'PHASE 2: PICKING',
      image: 'public/tutorial/mappicked.png', 
      text: 'If your match is a Best Of 3, next is the Pick phase. Teams select the map they want to play (marked in Cyan). In a Best of 3 series, the map you pick is the one you are most confident in winning.'
    },
    {
      title: 'PHASE 3: SIDES',
      image: 'public/tutorial/sideselection.jpg', 
      text: 'Finally, the team that did NOT pick the map gets to choose the starting side: Attack or Defense.'
    }
  ];

  openInstructions(): void {
    this.showInstructions = true;
    this.instructionStep = 0;
  }

  closeInstructions(): void {
    this.showInstructions = false;
  }

  nextInstruction(): void {
    if (this.instructionStep < this.tutorialSteps.length - 1) {
      this.instructionStep++;
    } else {
      this.closeInstructions();
    }
  }

  prevInstruction(): void {
    if (this.instructionStep > 0) {
      this.instructionStep--;
    }
  }
}