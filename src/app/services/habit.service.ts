import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  DocumentData, 
  CollectionReference,
  DocumentReference
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, from, map, of, BehaviorSubject, switchMap } from 'rxjs';
import { Habit, HabitCompletion, HabitStats } from '../models/habit.model';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private habitsCollection: CollectionReference<DocumentData>;
  private habitsSubject = new BehaviorSubject<Habit[]>([]);
  habits$ = this.habitsSubject.asObservable();
  private statsSubject = new BehaviorSubject<HabitStats>({
    totalHabits: 0,
    totalCompletions: 0,
    avgSuccessRate: 0,
    bestStreak: 0
  });
  stats$ = this.statsSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) { 
    this.habitsCollection = collection(this.firestore, 'habits');
    
    // Load habits when authentication state changes
    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.loadHabits();
      } else {
        this.habitsSubject.next([]);
        this.statsSubject.next({
          totalHabits: 0,
          totalCompletions: 0,
          avgSuccessRate: 0,
          bestStreak: 0
        });
      }
    });
  }

  private async loadHabits() {
    const user = this.auth.currentUser;
    if (!user) {
      this.habitsSubject.next([]);
      this.updateStats([]);
      return;
    }

    try {
      const q = query(
        this.habitsCollection,
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const habits: Habit[] = [];
      const habitsToUpdate: Habit[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const habit: Habit = {
          id: doc.id,
          name: data['name'],
          color: data['color'],
          userId: data['userId'],
          createdAt: data['createdAt']?.toDate() || new Date(),
          lastCompleted: data['lastCompleted']?.toDate(),
          currentStreak: data['currentStreak'] || 0,
          bestStreak: data['bestStreak'] || 0,
          completions: (data['completions'] || []).map((c: any) => ({
            date: c.date?.toDate() || new Date(),
            completed: c.completed
          }))
        };
        
        // Check for missing completions and mark them as incomplete
        const updatedHabit = this.addMissingCompletions(habit);
        habits.push(updatedHabit);
        
        // If we added missing completions, queue this habit for update in Firestore
        if (updatedHabit.completions.length > habit.completions.length) {
          habitsToUpdate.push(updatedHabit);
        }
      });
      
      // Update habits with missing completions in Firestore
      for (const habitToUpdate of habitsToUpdate) {
        if (habitToUpdate.id) {
          const habitRef = doc(this.firestore, `habits/${habitToUpdate.id}`) as DocumentReference<DocumentData>;
          await updateDoc(habitRef, { 
            completions: habitToUpdate.completions,
            currentStreak: habitToUpdate.currentStreak,
            bestStreak: habitToUpdate.bestStreak
          });
        }
      }
      
      this.habitsSubject.next(habits);
      this.updateStats(habits);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  }

  private updateStats(habits: Habit[]) {
    const totalHabits = habits.length;
    let totalCompletions = 0;
    let totalSuccess = 0;
    let bestStreak = 0;

    habits.forEach(habit => {
      const completions = habit.completions || [];
      totalCompletions += completions.length;
      totalSuccess += completions.filter(c => c.completed).length;
      bestStreak = Math.max(bestStreak, habit.bestStreak);
    });

    const avgSuccessRate = totalCompletions > 0 ? 
      Math.round((totalSuccess / totalCompletions) * 100) : 0;

    this.statsSubject.next({
      totalHabits,
      totalCompletions: totalSuccess,
      avgSuccessRate,
      bestStreak
    });
  }

  async createHabit(habit: Omit<Habit, 'id' | 'currentStreak' | 'bestStreak' | 'completions' | 'userId'>): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const newHabit = {
        ...habit,
        userId: user.uid,
        currentStreak: 0,
        bestStreak: 0,
        completions: [],
        createdAt: new Date()
      };
      
      const docRef = await addDoc(this.habitsCollection, newHabit);
      this.loadHabits(); // Refresh habits list
      return docRef.id;
    } catch (error) {
      console.error('Error creating habit:', error);
      throw error;
    }
  }

  async updateHabit(habit: Habit): Promise<void> {
    if (!habit.id) return;
    
    try {
      const habitRef = doc(this.firestore, `habits/${habit.id}`);
      await updateDoc(habitRef, { ...habit });
      this.loadHabits(); // Refresh habits list
    } catch (error) {
      console.error('Error updating habit:', error);
      throw error;
    }
  }

  async deleteHabit(habitId: string): Promise<void> {
    try {
      const habitRef = doc(this.firestore, `habits/${habitId}`);
      await deleteDoc(habitRef);
      this.loadHabits(); // Refresh habits list
    } catch (error) {
      console.error('Error deleting habit:', error);
      throw error;
    }
  }

  async toggleHabitCompletion(habit: Habit, date: Date): Promise<void> {
    if (!habit.id) return;
    
    try {
      // Normalize dates to start of day to avoid timezone issues
      const normalizeDate = (d: Date) => {
        const normalized = new Date(d);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      };
      
      const targetDate = normalizeDate(date);
      
      // Get the latest habit data from the BehaviorSubject
      const currentHabit = this.habitsSubject.value.find(h => h.id === habit.id) || habit;
      
      // Find existing completion
      const existingIndex = (currentHabit.completions || []).findIndex(c => {
        const compDate = normalizeDate(c.date);
        return compDate.getTime() === targetDate.getTime();
      });

      const updatedCompletions = [...(currentHabit.completions || [])];
      
      if (existingIndex >= 0) {
        // Toggle existing completion
        updatedCompletions[existingIndex] = {
          ...updatedCompletions[existingIndex],
          completed: !updatedCompletions[existingIndex].completed
        };
      } else {
        // Add new completion
        updatedCompletions.push({
          date: targetDate,
          completed: true
        });
      }
      
      // Calculate streaks
      const { currentStreak, bestStreak } = this.calculateStreaks(updatedCompletions);
      
      // Update the habit
      const habitRef = doc(this.firestore, `habits/${habit.id}`) as DocumentReference<DocumentData>;
      await updateDoc(habitRef, { 
        completions: updatedCompletions,
        lastCompleted: targetDate,
        currentStreak,
        bestStreak
      });
      
      // Update local state
      const currentHabits = this.habitsSubject.value;
      const updatedHabits = currentHabits.map(h => 
        h.id === habit.id 
          ? { 
              ...h, 
              completions: updatedCompletions,
              currentStreak,
              bestStreak,
              lastCompleted: targetDate
            } 
          : h
      );
      this.habitsSubject.next(updatedHabits);
      
      // Update the statistics
      this.updateStats(updatedHabits);
    } catch (error) {
      console.error('Error toggling habit completion:', error);
      throw error;
    }
  }

  /**
   * Adds missing completions for days after the habit creation date
   * that have not been marked as either complete or incomplete
   */
  private addMissingCompletions(habit: Habit): Habit {
    if (!habit.createdAt) return habit;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const creationDate = new Date(habit.createdAt);
    creationDate.setHours(0, 0, 0, 0);
    
    const existingCompletions = [...habit.completions];
    let modified = false;
    
    // Create a map of existing completion dates for quick lookup
    const completionMap = new Map<string, boolean>();
    existingCompletions.forEach(completion => {
      const dateObj = new Date(completion.date);
      dateObj.setHours(0, 0, 0, 0);
      const dateKey = dateObj.toISOString().split('T')[0];
      completionMap.set(dateKey, completion.completed);
    });
    
    // Check each day from creation date until yesterday
    const currentDate = new Date(creationDate);
    while (currentDate < today) {
      const dateKey = currentDate.toISOString().split('T')[0];
      
      // If no completion exists for this date, add one marked as incomplete
      if (!completionMap.has(dateKey)) {
        existingCompletions.push({
          date: new Date(currentDate),
          completed: false // Mark as incomplete
        });
        modified = true;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // If we added any missing completions, recalculate streaks
    if (modified) {
      const { currentStreak, bestStreak } = this.calculateStreaks(existingCompletions);
      return {
        ...habit,
        completions: existingCompletions,
        currentStreak,
        bestStreak
      };
    }
    
    return habit;
  }

  private calculateStreaks(completions: HabitCompletion[]): { currentStreak: number, bestStreak: number } {
    if (!completions.length) return { currentStreak: 0, bestStreak: 0 };
    
    // Sort completions by date (newest first)
    const sortedCompletions = [...completions].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;
    
    // Calculate current streak (consecutive days from today/most recent)
    for (const completion of sortedCompletions) {
      if (!completion.completed) continue;
      
      const currentDate = new Date(completion.date);
      
      if (!lastDate) {
        // First completed date
        lastDate = currentDate;
        currentStreak = 1;
        continue;
      }
      
      // Check if this completion is consecutive to the last one
      const dayDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        // Consecutive day
        currentStreak++;
        lastDate = currentDate;
      } else if (dayDiff > 1) {
        // Streak broken
        break;
      }
    }
    
    // Calculate best streak
    lastDate = null;
    for (const completion of sortedCompletions) {
      if (!completion.completed) continue;
      
      const currentDate = new Date(completion.date);
      
      if (!lastDate) {
        // First completed date
        lastDate = currentDate;
        tempStreak = 1;
        bestStreak = Math.max(bestStreak, tempStreak);
        continue;
      }
      
      // Check if this completion is consecutive to the last one
      const dayDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        // Consecutive day
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
        lastDate = currentDate;
      } else if (dayDiff > 1) {
        // Streak broken
        tempStreak = 1;
        lastDate = currentDate;
      }
    }
    
    return { currentStreak, bestStreak };
  }

  getHabitsByDate(date: Date): Observable<Habit[]> {
    return this.habits$.pipe(
      map(habits => {
        const formattedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return habits.map(habit => ({
          ...habit,
          completedToday: habit.completions?.some(c => 
            c.completed &&
            c.date.getFullYear() === formattedDate.getFullYear() &&
            c.date.getMonth() === formattedDate.getMonth() &&
            c.date.getDate() === formattedDate.getDate()
          ) || false
        }));
      })
    );
  }

  getWeeklyData(habit: Habit, startDate: Date): Observable<{date: Date, completed: boolean}[]> {
    // Get the latest habit data from the BehaviorSubject
    const currentHabit = this.habitsSubject.value.find(h => h.id === habit.id) || habit;
    
    const result = [];
    const currentDate = new Date(startDate);
    
    // Generate data for 7 days starting from startDate
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);
      
      // Normalize dates for comparison
      const normalizeDate = (d: Date) => {
        const normalized = new Date(d);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      };
      
      const targetDate = normalizeDate(date);
      
      // Find if there's a completion for this date
      const completion = currentHabit.completions?.find(c => {
        const compDate = normalizeDate(c.date);
        return compDate.getTime() === targetDate.getTime();
      });
      
      result.push({
        date,
        completed: completion?.completed || false
      });
    }
    
    return of(result);
  }
}
