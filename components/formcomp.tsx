"use client"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
    genres: z.string().min(2, {
        message: "must be at least 2 characters.",
    }),
    songs: z.string().min(2, {
        message: "must be at least 2 characters.",
    }),
})


export function FormComp() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),

    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.
        console.log(values)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="genres"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sooo... what are we feeling tonight, moviewise?</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="songs"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>What songs fit the vibe tonight?</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="songs"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Choose your preferred age rating</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Choose your preferred age rating" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Age Ratings</SelectLabel>
                                        <SelectItem value="G">G</SelectItem>
                                        <SelectItem value="PG">PG</SelectItem>
                                        <SelectItem value="PG-13">PG-13</SelectItem>
                                        <SelectItem value="R">R</SelectItem>
                                        <SelectItem value="NC-17">NC-17</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="songs"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Preferred language</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Choose your preferred language" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Languages</SelectLabel>
                                        <SelectItem value="English">English</SelectItem>
                                        <SelectItem value="German">German</SelectItem>
                                        <SelectItem value="French">French</SelectItem>
                                        <SelectItem value="Spanish">Spanish</SelectItem>
                                        <SelectItem value="Bengali">Bengali</SelectItem>
                                        <SelectItem value="Hindi">Hindi</SelectItem>
                                        <SelectItem value="Korean">Korean</SelectItem>
                                        <SelectItem value="Japanese">Japanese</SelectItem>
                                        <SelectItem value="Chinese">Chinese</SelectItem>
                                        <SelectItem value="Arabic">Arabic</SelectItem>
                                        <SelectItem value="Russian">Russian</SelectItem>
                                        <SelectItem value="Portuguese">Portuguese</SelectItem>
                                        <SelectItem value="Italian">Italian</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="songs"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>What era are you in the mood for?</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Choose your preferred language" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Era</SelectLabel>
                                        <SelectItem value="1920s">1920s</SelectItem>
                                        <SelectItem value="1930s">1930s</SelectItem>
                                        <SelectItem value="1940s">1940s</SelectItem>
                                        <SelectItem value="1950s">1950s</SelectItem>
                                        <SelectItem value="1960s">1960s</SelectItem>
                                        <SelectItem value="1970s">1970s</SelectItem>
                                        <SelectItem value="1980s">1980s</SelectItem>
                                        <SelectItem value="1990s">1990s</SelectItem>
                                        <SelectItem value="2000s">2000s</SelectItem>
                                        <SelectItem value="2010s">2010s</SelectItem>
                                        <SelectItem value="2020s">2020s</SelectItem>
                                
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />

                <Button type="submit"> Submit</Button>
            </form>
        </Form>
    )
}