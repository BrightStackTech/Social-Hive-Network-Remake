import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Listbox } from '@headlessui/react';

interface DeviceSelectorProps {
  label: string;
  icon: React.ReactNode;
  devices: any[];
  selectedDevice: any;
  onSelect: (device: any) => void;
  disabled?: boolean;
}

export const DeviceSelector = ({ label, devices, selectedDevice, onSelect, disabled }: DeviceSelectorProps) => {
  return (
    <div className="relative">
      <Listbox value={selectedDevice} onChange={onSelect} disabled={disabled}>
        <Listbox.Button className="flex items-center gap-2 text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light transition-all bg-transparent px-4 py-2 rounded-md border border-border-dark [html.light_&]:border-border-light hover:border-border-dark/20 outline-none cursor-pointer text-sm whitespace-nowrap w-full md:w-auto justify-between disabled:opacity-30">
          <div className="flex items-center gap-2 w-full">
            <span className="max-w-[80%] md:max-w-[100px] overflow-hidden text-ellipsis">{selectedDevice?.label || `Permission ...`}</span>
          </div>
          <ChevronDown size={12} className="opacity-40" />
        </Listbox.Button>
        <Listbox.Options className="absolute bottom-full mb-2 w-full min-w-[200px] bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light rounded-xl overflow-hidden shadow-2xl z-[60] py-1">
          {devices.map((device) => (
            <Listbox.Option
              key={device.deviceId || device.id}
              value={device}
              className={({ active }) =>
                `px-4 py-2 text-sm cursor-pointer transition-colors ${
                  active ? 'bg-primary text-white' : 'text-text-dark [html.light_&]:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-black/5'
                }`
              }
            >
              {device.label || `${label} ${device.deviceId || device.id}`}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>
    </div>
  );
};

export const MicSelector = (props: any) => <DeviceSelector label="Microphone" {...props} />;
export const CameraSelector = (props: any) => <DeviceSelector label="Camera" {...props} />;
export const SpeakerSelector = (props: any) => <DeviceSelector label="Speaker" {...props} />;
