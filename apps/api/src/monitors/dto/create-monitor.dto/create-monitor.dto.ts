import { IsString, Max, IsNumber, IsUrl, IsNotEmpty, Min, isDateString, isBoolean } from 'class-validator';

export class CreateMonitorDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsUrl()
    @IsNotEmpty()
    url: string;

    @IsNumber()
    @Min(60)
    interval: number;

    @IsNumber()
    @Min(1)
    @Max(30)
    timeout: number;


    // @isDateString()
    // createdAt: string;

    // @isDateString()
    // updatedAt: string;

    // @isBoolean()
    // enabled: boolean;
}