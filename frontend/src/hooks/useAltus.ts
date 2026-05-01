import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useSnapshot() {
  return useQuery(['snapshot'], () => api.getSnapshot(), {
    refetchInterval: 5000,
  });
}

export function useHistory() {
  return useQuery(['history'], () => api.getHistory());
}

export function useGoal() {
  return useQuery(['goal'], () => api.getGoal());
}

export function useJournal() {
  return useQuery(['journal', 'today'], () => api.getJournal());
}

export function useJournalForDate(dateStr: string) {
  return useQuery(['journal', dateStr], () => api.getJournalForDate(dateStr), {
    enabled: !!dateStr
  });
}

export function useUser() {
  return useQuery(['user'], () => api.getUser());
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation(
    (data: any) => api.updateUser(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user']);
        queryClient.invalidateQueries(['snapshot']);
      },
    }
  );
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation(
    (data: { direction: string; weekly_rate_kg: number }) => api.updateGoal(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['goal']);
        queryClient.invalidateQueries(['snapshot']);
      },
    }
  );
}

export function useLogFood() {
  const queryClient = useQueryClient();
  return useMutation(
    (data: any) => api.logFood(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['snapshot']);
        queryClient.invalidateQueries(['history']);
        queryClient.invalidateQueries(['journal']);
      },
    }
  );
}

export function useUpdateFood() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ foodId, data }: { foodId: number; data: any }) => api.updateFood(foodId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['snapshot']);
        queryClient.invalidateQueries(['history']);
        queryClient.invalidateQueries(['journal']);
      },
    }
  );
}

export function useDeleteFood() {
  const queryClient = useQueryClient();
  return useMutation(
    (foodId: number) => api.deleteFood(foodId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['snapshot']);
        queryClient.invalidateQueries(['history']);
        queryClient.invalidateQueries(['journal']);
      },
    }
  );
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ activityId, data }: { activityId: number; data: any }) => api.updateActivity(activityId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['snapshot']);
        queryClient.invalidateQueries(['history']);
        queryClient.invalidateQueries(['journal']);
      },
    }
  );
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation(
    (activityId: number) => api.deleteActivity(activityId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['snapshot']);
        queryClient.invalidateQueries(['history']);
        queryClient.invalidateQueries(['journal']);
      },
    }
  );
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  return useMutation(
    (data: any) => api.logActivity(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['snapshot']);
        queryClient.invalidateQueries(['history']);
        queryClient.invalidateQueries(['journal']);
      },
    }
  );
}

export function useLogHealth() {
    const queryClient = useQueryClient();
    return useMutation(
      (data: any) => api.logHealth(data),
      {
        onSuccess: () => {
          queryClient.invalidateQueries(['snapshot']);
          queryClient.invalidateQueries(['journal']);
          queryClient.invalidateQueries(['history']);
        },
      }
    );
  }

export function useUpdateHealth() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ healthId, data }: { healthId: number; data: any }) => api.updateHealth(healthId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['snapshot']);
        queryClient.invalidateQueries(['journal']);
        queryClient.invalidateQueries(['history']);
      },
    }
  );
}

export function useDeleteHealth() {
  const queryClient = useQueryClient();
  return useMutation(
    (healthId: number) => api.deleteHealth(healthId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['snapshot']);
        queryClient.invalidateQueries(['journal']);
        queryClient.invalidateQueries(['history']);
      },
    }
  );
}

export function useLatestHealth() {
  return useQuery(['health', 'latest'], () => api.getLatestHealth());
}

export function useEstimate() {
  return useMutation(
    (text: string) => api.estimate(text)
  );
}

export function useChatLog() {
    const queryClient = useQueryClient();
    return useMutation(
      (message: string) => api.chatLog({ message }),
      {
        onSuccess: () => {
          queryClient.invalidateQueries(['snapshot']);
          queryClient.invalidateQueries(['journal']);
        },
      }
    );
}
